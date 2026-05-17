import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:csv/csv.dart';
import 'package:excel/excel.dart' as ex;
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_button_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../shared/providers/auth_provider.dart';

class InventoryImportScreen extends StatefulWidget {
  const InventoryImportScreen({super.key});

  @override
  State<InventoryImportScreen> createState() => _InventoryImportScreenState();
}

class _InventoryImportScreenState extends State<InventoryImportScreen> {
  PlatformFile? _selectedFile;
  List<String> _headers = [];
  Map<String, String> _mappings = {};
  bool _isDryRun = true;
  bool _isProcessing = false;
  double _progress = 0;
  String? _statusMessage;
  Map<String, dynamic> _summary = {};
  List<dynamic> _errors = [];

  final List<Map<String, String>> _internalFields = [
    {'id': 'name', 'label': 'Product Name', 'req': 'true'},
    {'id': 'sku', 'label': 'SKU / ID', 'req': 'false'},
    {'id': 'barcode', 'label': 'Barcode / GTIN', 'req': 'false'},
    {'id': 'price', 'label': 'Sale Price', 'req': 'false'},
    {'id': 'cost', 'label': 'Cost Price', 'req': 'false'},
    {'id': 'brand', 'label': 'Brand', 'req': 'false'},
    {'id': 'category', 'label': 'Category', 'req': 'false'},
    {'id': 'group_tag', 'label': 'Size/Group Tag', 'req': 'false'},
    // stock_qty is intentionally omitted: the edge function requires
    // store_code alongside any stock_qty > 0 or it throws a hard error.
    // Stock levels can be set separately via the Adjust Stock flow.
    {'id': 'image_url', 'label': 'Image URL', 'req': 'false'},
    {'id': 'description', 'label': 'Description', 'req': 'false'},
  ];

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv', 'xlsx', 'xls'],
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        List<String> headers = [];

        if (file.bytes == null) {
          setState(() => _statusMessage = 'Error: No file data retrieved');
          return;
        }

        if (file.name.toLowerCase().endsWith('.csv')) {
          final content = utf8.decode(file.bytes!);
          final rows = const CsvToListConverter().convert(content);
          if (rows.isNotEmpty) {
            headers = rows.first.map((e) => e.toString()).toList();
          }
        } else {
          final excel = ex.Excel.decodeBytes(file.bytes!);
          for (var table in excel.tables.keys) {
            final sheet = excel.tables[table];
            if (sheet != null && sheet.maxColumns > 0 && sheet.rows.isNotEmpty) {
              // Extract header row values safely
              headers = sheet.rows.first.map((e) {
                if (e == null || e.value == null) return '';
                final val = e.value;
                if (val is ex.TextCellValue) {
                  return val.value.text ?? '';
                } else if (val is ex.IntCellValue) {
                  return val.value.toString();
                } else if (val is ex.DoubleCellValue) {
                  return val.value.toString();
                } else if (val is ex.BoolCellValue) {
                  return val.value.toString();
                } else if (val is ex.FormulaCellValue) {
                  return val.formula.toString();
                }
                return val.toString();
              }).toList();
              break;
            }
          }
        }

        setState(() {
          _selectedFile = file;
          _headers = headers;
          _autoMapHeaders(headers);
          _summary = {};
          _errors = [];
          _statusMessage = null;
        });
      }
    } catch (e) {
      debugPrint('File picker error: $e');
      setState(() => _statusMessage = 'Error reading file config: $e');
    }
  }

  void _autoMapHeaders(List<String> headers) {
    final newMappings = <String, String>{};
    for (var field in _internalFields) {
      final id = field['id']!;
      final label = field['label']!.toLowerCase();
      
      // Look for exact or fuzzy matches
      for (var header in headers) {
        final h = header.toLowerCase();
        if (h == id || h == label || 
            (id == 'name' && (h == 'title' || h == 'product')) ||
            (id == 'barcode' && (h == 'gtin' || h == 'ean' || h == 'upc')) ||
            (id == 'sku' && h == 'id') ||
            (id == 'group_tag' && h == 'item_group_id') ||
            (id == 'image_url' && h == 'image_link')) {
          newMappings[id] = header;
          break;
        }
      }
    }
    setState(() => _mappings = newMappings);
  }

  void _applyGoogleMapping() {
    final googleMap = {
      'sku': 'id',
      'name': 'title',
      'description': 'description',
      'image_url': 'image_link',
      'price': 'price',
      'brand': 'brand',
      'barcode': 'gtin',
      'group_tag': 'item_group_id',
    };
    
    final finalMap = <String, String>{};
    for (var entry in googleMap.entries) {
      if (_headers.contains(entry.value)) {
        finalMap[entry.key] = entry.value;
      }
    }
    setState(() => _mappings = finalMap);
  }

  Future<void> _startImport() async {
    if (_selectedFile == null) return;

    setState(() {
      _isProcessing = true;
      _progress = 0;
      _summary = {};
      _errors = [];
      _statusMessage = 'Starting import...';
    });

    try {
      // Get the real Supabase JWT from AuthProvider (set during manager/admin PIN login).
      final auth = context.read<AuthProvider>();
      final token = auth.supabaseAccessToken;
      if (token == null) {
        throw Exception(
          'No active session. Please sign out and log in again with your manager/admin PIN.',
        );
      }

      final url = Uri.parse('${dotenv.env['SUPABASE_URL']}/functions/v1/import-inventory');
      String? runId;
      bool complete = false;

      while (!complete) {
        final request = http.MultipartRequest('POST', url)
          ..headers.addAll({'Authorization': 'Bearer $token'})
          ..fields['dry_run'] = _isDryRun.toString()
          ..fields['mappings'] = jsonEncode(_mappings)
          ..fields['max_rows'] = '200';

        if (runId != null) {
          request.fields['import_run_id'] = runId;
        }

        request.files.add(http.MultipartFile.fromBytes(
          'file',
          _selectedFile!.bytes!,
          filename: _selectedFile!.name,
        ));

        final streamedRes = await request.send();
        final res = await http.Response.fromStream(streamedRes);

        if (res.statusCode != 200) {
          throw Exception('Server error (${res.statusCode}): ${res.body}');
        }

        final data = jsonDecode(res.body);
        runId = data['import_run_id'];
        complete = data['processing_complete'] ?? true;

        setState(() {
          _summary = data;
          _errors = data['errors'] ?? [];
          final total = data['rows_total'] ?? 1;
          final processed = data['next_row_index'] ?? 0;
          _progress = (processed / total).clamp(0.0, 1.0);
          _statusMessage = complete 
            ? (_isDryRun ? 'Dry run complete. No data saved.' : 'Import successful!')
            : 'Processing... $processed/$total rows';
        });

        if (!complete) await Future.delayed(const Duration(milliseconds: 500));
      }
    } catch (e) {
      setState(() => _statusMessage = 'Import failed: $e');
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      appBar: AppBar(
        title: Text('Inventory Master Import', style: AppTextStyles.headingLg),
        actions: [
          if (_selectedFile != null)
            TextButton.icon(
              onPressed: _pickFile,
              icon: Icon(Icons.file_upload, color: AppColors.primaryOn),
              label: Text('Change File', style: AppTextStyles.labelMd.copyWith(color: AppColors.primaryOn)),
            ),
        ],
      ),
      body: _selectedFile == null ? _buildFilePicker() : _buildImportWorkspace(),
    );
  }

  Widget _buildFilePicker() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.table_chart_outlined, size: 80, color: AppColors.primaryDefault.withValues(alpha: 0.5)),
          const SizedBox(height: AppSpacing.space6),
          Text('Bulk Inventory Upload', style: AppTextStyles.headingXl.copyWith(color: AppColors.textPrimary)),
          const SizedBox(height: AppSpacing.space2),
          Text('Upload Google MC, Excel or CSV files', style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: AppSpacing.space8),
          ElevatedButton.icon(
            onPressed: _pickFile,
            icon: const Icon(Icons.add),
            label: const Text('SELECT INVENTORY FILE'),
            style: AppButtonStyles.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildImportWorkspace() {
    final isTablet = MediaQuery.of(context).size.width > 900;
    
    return Row(
      children: [
        // Configuration Sidebar
        SizedBox(
          width: isTablet ? 350 : 300,
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.surfaceRaised,
              border: Border(right: BorderSide(color: AppColors.borderDefault)),
            ),
            child: Column(
              children: [
                Expanded(child: _buildMappingList()),
                _buildActionPanel(),
              ],
            ),
          ),
        ),
        // Results & Progress
        Expanded(
          child: Column(
            children: [
              if (_isProcessing) 
                LinearProgressIndicator(value: _progress, backgroundColor: AppColors.surfaceDefault, color: AppColors.primaryDefault),
              Expanded(
                child: _summary.isEmpty 
                  ? _buildPreviewPlaceholder()
                  : _buildResultsView(),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMappingList() {
    return ListView(
      padding: AppSpacing.insetLg,
      children: [
        Text('COLUMN MAPPING', style: AppTextStyles.labelMd.copyWith(letterSpacing: 1.2, color: AppColors.primaryDefault)),
        const SizedBox(height: AppSpacing.space4),
        ..._internalFields.map((field) {
          final id = field['id']!;
          final isRequired = field['req'] == 'true';
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(field['label']!, style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary)),
                    if (isRequired) Text(' *', style: AppTextStyles.bodySm.copyWith(color: AppColors.dangerDefault)),
                  ],
                ),
                const SizedBox(height: AppSpacing.space2),
                Container(
                  padding: AppSpacing.insetSquishSm,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDefault,
                    borderRadius: AppRadius.borderSm,
                    border: Border.all(color: _mappings.containsKey(id) ? AppColors.primaryDefault.withValues(alpha: 0.3) : AppColors.borderDefault),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _mappings[id],
                      hint: Text('Skip field', style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary)),
                      dropdownColor: AppColors.surfaceRaised,
                      items: [
                        DropdownMenuItem<String>(value: null, child: Text('Skip field', style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary))),
                        ..._headers.map((h) => DropdownMenuItem(value: h, child: Text(h, overflow: TextOverflow.ellipsis, style: AppTextStyles.bodySm.copyWith(color: AppColors.textPrimary)))),
                      ],
                      onChanged: (val) => setState(() {
                        if (val == null) {
                          _mappings.remove(id);
                        } else {
                          _mappings[id] = val;
                        }
                      }),
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildActionPanel() {
    return Container(
      padding: AppSpacing.insetLg,
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        border: Border(top: BorderSide(color: AppColors.borderDefault)),
      ),
      child: Column(
        children: [
          OutlinedButton.icon(
            onPressed: _applyGoogleMapping,
            icon: const Icon(Icons.auto_awesome),
            label: const Text('Google MC Preset'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 45),
              side: BorderSide(color: AppColors.primaryDefault.withValues(alpha: 0.5)),
            ),
          ),
          const SizedBox(height: AppSpacing.space4),
          SwitchListTile(
            title: Text('Dry Run Only', style: AppTextStyles.bodyMd),
            subtitle: Text('Validate without saving', style: AppTextStyles.bodySm),
            value: _isDryRun,
            onChanged: _isProcessing ? null : (v) => setState(() => _isDryRun = v),
            activeColor: AppColors.primaryDefault,
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: AppSpacing.space4),
          ElevatedButton(
            onPressed: _isProcessing ? null : _startImport,
            style: _isDryRun 
                ? AppButtonStyles.primary.copyWith(backgroundColor: WidgetStateProperty.all(Colors.blueGrey))
                : AppButtonStyles.primary,
            child: Text(
              _isProcessing ? 'PROCESSING...' : (_isDryRun ? 'DRY RUN' : 'START IMPORT'),
              style: AppTextStyles.labelLg.copyWith(color: AppColors.primaryOn),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreviewPlaceholder() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.checklist_rtl_rounded, size: 60, color: AppColors.textSecondary),
          const SizedBox(height: AppSpacing.space4),
          Text('File: ${_selectedFile!.name}', style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary)),
          Text('Configure mappings and click Start.', style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildResultsView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_statusMessage ?? 'Processing Result', style: AppTextStyles.headingLg),
                    const SizedBox(height: AppSpacing.space1),
                    Text('Mode: ${_isDryRun ? "Dry Run (Simulated)" : "Production (Applied)"}', style: AppTextStyles.bodySm.copyWith(color: _isDryRun ? AppColors.primaryDefault : Colors.orangeAccent)),
                  ],
                ),
              ),
              if (_progress < 1.0 && _isProcessing)
                CircularProgressIndicator(value: _progress, color: AppColors.primaryDefault),
            ],
          ),
          const SizedBox(height: 32),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              _buildStatCard('TOTAL ROWS', _summary['rows_total']?.toString() ?? '0', Icons.segment),
              _buildStatCard('SUCCEEDED', _summary['rows_succeeded']?.toString() ?? '0', Icons.check_circle_outline, Colors.green),
              _buildStatCard('FAILED', _summary['rows_failed']?.toString() ?? '0', Icons.error_outline, Colors.redAccent),
              _buildStatCard('INSERTED', _summary['items_inserted']?.toString() ?? '0', Icons.add_business_outlined),
              _buildStatCard('UPDATED', _summary['items_updated']?.toString() ?? '0', Icons.update),
              _buildStatCard('STOCKS', _summary['stock_movements']?.toString() ?? '0', Icons.inventory_2_outlined),
            ],
          ),
          if (_errors.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.space10),
            Text('ERROR LOG', style: AppTextStyles.labelMd.copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: AppSpacing.space4),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surfaceDefault,
                borderRadius: AppRadius.borderMd,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _errors.length,
                separatorBuilder: (_, __) => Divider(color: AppColors.borderDefault, height: 1),
                itemBuilder: (ctx, i) {
                  final err = _errors[i];
                  return ListTile(
                    leading: Text('#${err['row']}', style: AppTextStyles.labelMd.copyWith(color: AppColors.textMuted)),
                    title: Text(err['error'] ?? 'Unknown error', style: AppTextStyles.bodySm.copyWith(color: AppColors.dangerDefault)),
                    subtitle: Text(err['code'] ?? '', style: AppTextStyles.bodyXs.copyWith(color: AppColors.textMuted)),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, [Color? color]) {
    return Container(
      width: 160,
      padding: AppSpacing.insetMd,
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: AppRadius.borderMd,
        border: Border.all(color: AppColors.borderDefault),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color ?? AppColors.textMuted, size: 20),
          const SizedBox(height: AppSpacing.space3),
          Text(value, style: AppTextStyles.headingXl.copyWith(color: AppColors.textPrimary)),
          const SizedBox(height: AppSpacing.space1),
          Text(label, style: AppTextStyles.labelXs.copyWith(color: AppColors.textMuted)),
        ],
      ),
    );
  }
}

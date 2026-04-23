import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
// import 'package:fl_chart/fl_chart.dart';
import 'pos_session_summary_screen.dart';

class ManagerDashboardScreen extends StatefulWidget {
  const ManagerDashboardScreen({super.key});

  @override
  State<ManagerDashboardScreen> createState() => _ManagerDashboardScreenState();
}

class _ManagerDashboardScreenState extends State<ManagerDashboardScreen> {
  final _supabase = Supabase.instance.client;
  bool _loading = true;
  String? _error;
  
  final Map<String, dynamic> _stats = {
    'today_sales': 0.0,
    'total_orders': 0,
    'active_sessions': 0,
    'low_stock_count': 0,
  };
  
  List<dynamic> _recentSessions = [];
  List<dynamic> _salesTrend = [];

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() { _loading = true; _error = null; });
    try {
      final userResponse = await _supabase.from('users').select('store_id').eq('auth_id', _supabase.auth.currentUser!.id).maybeSingle();
      if (userResponse == null) throw Exception('Store not found for user');
      final storeId = userResponse['store_id'];

      final statsResp = await _supabase.rpc('get_manager_dashboard_stats', params: {'p_store_id': storeId});
      
      if (mounted) {
        setState(() {
          _stats['today_sales'] = (statsResp['today_sales'] as num?)?.toDouble() ?? 0.0;
          _stats['total_orders'] = statsResp['total_orders'] as int? ?? 0;
          _stats['active_sessions'] = statsResp['active_sessions'] as int? ?? 0;
          _stats['low_stock_count'] = statsResp['low_stock_count'] as int? ?? 0;
          _recentSessions = statsResp['recent_sessions'] as List<dynamic>? ?? [];
          _salesTrend = statsResp['sales_trend'] as List<dynamic>? ?? [];
          
          // Fallback mockup if RPC hasn't been updated yet:
          if (_salesTrend.isEmpty) {
            _salesTrend = [
              {'date': DateTime.now().subtract(const Duration(days: 6)).toIso8601String(), 'sales': _stats['today_sales'] * 0.5},
              {'date': DateTime.now().subtract(const Duration(days: 5)).toIso8601String(), 'sales': _stats['today_sales'] * 0.7},
              {'date': DateTime.now().subtract(const Duration(days: 4)).toIso8601String(), 'sales': _stats['today_sales'] * 0.4},
              {'date': DateTime.now().subtract(const Duration(days: 3)).toIso8601String(), 'sales': _stats['today_sales'] * 0.9},
              {'date': DateTime.now().subtract(const Duration(days: 2)).toIso8601String(), 'sales': _stats['today_sales'] * 1.2},
              {'date': DateTime.now().subtract(const Duration(days: 1)).toIso8601String(), 'sales': _stats['today_sales'] * 0.8},
              {'date': DateTime.now().toIso8601String(), 'sales': _stats['today_sales']},
            ];
          }
          
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('Dashboard Error: $e');
      if (mounted) {
        setState(() {
          _error = 'Failed to load dashboard data. Please check your connection or contact IT.';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: const Color(0xFF0D1117),
        appBar: AppBar(
          backgroundColor: const Color(0xFF161B22),
          title: const Text('Manager Dashboard', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadDashboardData,
            )
          ],
        ),
        body: _loading 
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFE8B84B)))
          : _error != null
            ? Center(child: Text(_error!, style: const TextStyle(color: Colors.redAccent)))
            : RefreshIndicator(
                onRefresh: _loadDashboardData,
                color: const Color(0xFFE8B84B),
                backgroundColor: const Color(0xFF161B22),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildSummaryCards(),
                      const SizedBox(height: 24),
                      _buildSalesTrendGraph(),
                      const SizedBox(height: 24),
                      const Text('Recent POS Sessions', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      _buildSessionsList(),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildSummaryCards() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = (constraints.maxWidth - 16) / 2;
        return Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            _statCard('Today\'s Sales', '৳ ${_stats['today_sales'].toStringAsFixed(2)}', Icons.payments_outlined, const Color(0xFF2ECC71), cardWidth),
            _statCard('Total Orders', '${_stats['total_orders']}', Icons.receipt_long_outlined, const Color(0xFF3498DB), cardWidth),
            _statCard('Active Sessions', '${_stats['active_sessions']}', Icons.point_of_sale_outlined, const Color(0xFFE8B84B), cardWidth),
            _statCard('Low Stock', '${_stats['low_stock_count']}', Icons.warning_amber_rounded, const Color(0xFFE74C3C), cardWidth),
          ],
        );
      }
    );
  }

  Widget _buildSalesTrendGraph() {
    if (_salesTrend.isEmpty) return const SizedBox.shrink();

/*    List<FlSpot> spots = [];
    double maxY = 0;
    
    for (int i = 0; i < _salesTrend.length; i++) {
      final double sales = (_salesTrend[i]['sales'] as num?)?.toDouble() ?? 0.0;
      spots.add(FlSpot(i.toDouble(), sales));
      if (sales > maxY) maxY = sales;
    }
    if (maxY == 0) maxY = 100;*/

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('7-Day Sales Trend', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          SizedBox(
            height: 150,
            child: Center(
              child: Text(
                'Sales Chart (Disabled for Web Test)',
                style: TextStyle(color: Colors.white24, fontSize: 13, fontStyle: FontStyle.italic),
              ),
            ),
/*            child: LineChart(
              LineChartData(
                gridData: FlGridData(show: false),
                titlesData: FlTitlesData(show: false),
                borderData: FlBorderData(show: false),
                minX: 0,
                maxX: _salesTrend.length.toDouble() - 1,
                minY: 0,
                maxY: maxY * 1.2,
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: const Color(0xFF2ECC71),
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      color: const Color(0xFF2ECC71).withValues(alpha: 0.1),
                    ),
                  ),
                ],
              ),
            ),*/
          ),
        ],
      ),
    );
  }

  Widget _statCard(String title, String value, IconData icon, Color iconColor, double width) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(color: Colors.white60, fontSize: 13, fontWeight: FontWeight.w500)),
              Icon(icon, color: iconColor, size: 20),
            ],
          ),
          const SizedBox(height: 12),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildSessionsList() {
    if (_recentSessions.isEmpty) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(20),
        child: Text('No recent sessions found.', style: TextStyle(color: Colors.white54)),
      ));
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _recentSessions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final session = _recentSessions[index];
        final isOpen = session['status'] == 'open';
        final cashierName = session['cashier_name'] ?? 'Unknown Cashier';
        final openedAt = DateTime.parse(session['opened_at']).toLocal();
        final double salesTotal = (session['total_sales'] as num?)?.toDouble() ?? 0.0;
        
        return InkWell(
          onTap: () {
            Navigator.push(context, MaterialPageRoute(
              builder: (_) => PosSessionSummaryScreen(sessionId: session['id']),
            ));
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF161B22),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
              boxShadow: [
                BoxShadow(
                  color: isOpen ? const Color(0xFFE8B84B).withValues(alpha: 0.1) : Colors.black12,
                  blurRadius: 8,
                  offset: const Offset(0, 4)
                )
              ]
            ),
            child: Row(
              children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    color: isOpen ? const Color(0xFFE8B84B).withValues(alpha: 0.15) : Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isOpen ? const Color(0xFFE8B84B).withValues(alpha: 0.5) : Colors.transparent),
                  ),
                  child: Icon(
                    isOpen ? Icons.lock_open_rounded : Icons.lock_rounded, 
                    color: isOpen ? const Color(0xFFE8B84B) : Colors.white54, 
                    size: 24
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(session['session_number'] ?? 'Session', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isOpen ? const Color(0xFF2ECC71).withValues(alpha: 0.15) : Colors.white10,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(isOpen ? 'ACTIVE' : 'CLOSED', style: TextStyle(color: isOpen ? const Color(0xFF2ECC71) : Colors.white54, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                          )
                        ]
                      ),
                      const SizedBox(height: 4),
                      Text('Cashier: $cashierName', style: const TextStyle(color: Colors.white60, fontSize: 13)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('৳ ${salesTotal.toStringAsFixed(2)}', style: TextStyle(color: salesTotal > 0 ? const Color(0xFFE8B84B) : Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text(DateFormat('MMM dd, hh:mm a').format(openedAt), style: const TextStyle(color: Colors.white54, fontSize: 11)),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../../theme/app_theme.dart';

/// Address selector using Google Maps WebView
/// Loads local HTML file with address autocomplete
class AddressSelector extends StatefulWidget {
  final String? initialAddress;
  final ValueChanged<AddressResult> onAddressSelected;

  const AddressSelector({
    super.key,
    this.initialAddress,
    required this.onAddressSelected,
  });

  @override
  State<AddressSelector> createState() => _AddressSelectorState();
}

class _AddressSelectorState extends State<AddressSelector> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0D1117))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _isLoading = true),
          onPageFinished: (_) => setState(() => _isLoading = false),
        ),
      )
      ..addJavaScriptChannel(
        'FlutterChannel',
        onMessageReceived: _handleMessage,
      );

    _loadHtml();
  }

  Future<void> _loadHtml() async {
    // Load HTML from assets
    await _controller.loadFlutterAsset('assets/address_selection.html');
  }

  void _handleMessage(JavaScriptMessage message) {
    try {
      final data = jsonDecode(message.message) as Map<String, dynamic>;
      final result = AddressResult(
        address: data['address'] as String? ?? '',
        city: data['city'] as String? ?? '',
        state: data['state'] as String? ?? '',
        postalCode: data['postalCode'] as String? ?? '',
        country: data['country'] as String? ?? 'Bangladesh',
      );
      widget.onAddressSelected(result);
      Navigator.pop(context);
    } catch (e) {
      debugPrint('Address parsing error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        title: const Text('Select Delivery Address'),
        backgroundColor: const Color(0xFF161B22),
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: Colors.white70)),
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(
                color: Color(0xFFE8B84B),
              ),
            ),
        ],
      ),
    );
  }
}

/// Address result from Google Maps selector
class AddressResult {
  final String address;
  final String city;
  final String state;
  final String postalCode;
  final String country;

  const AddressResult({
    required this.address,
    required this.city,
    required this.state,
    required this.postalCode,
    required this.country,
  });

  String get formattedAddress => '$address, $city, $state $postalCode, $country';

  @override
  String toString() => 'AddressResult(address: $address, city: $city, state: $state, postalCode: $postalCode, country: $country)';
}

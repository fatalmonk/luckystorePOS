/// Backend Integration: bKash Tokenized Checkout APIs
/// Reference Implementation for Lucky Store App.
library;

import 'dart:convert';
import 'package:http/http.dart' as http;

class BkashService {
  final String _baseUrl = 'https://checkout.sandbox.bKash.com/v1.2.0-beta';
  final String _appKey = 'YOUR_APP_KEY';
  final String _appSecret = 'YOUR_APP_SECRET';
  
  // 1. Grant Token (Server-side context ideally, but shown for flow)
  Future<String?> grantToken() async {
    final response = await http.post(
      Uri.parse('$_baseUrl/tokenized/checkout/token/grant'),
      headers: {
        'Content-Type': 'application/json',
        'username': 'YOUR_USERNAME',
        'password': 'YOUR_PASSWORD',
      },
      body: jsonEncode({"app_key": _appKey, "app_secret": _appSecret}),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['id_token'];
    }
    return null;
  }

  // 2. Create Agreement (Initial Phase for returning customers)
  Future<String?> createAgreement(String idToken, String payerReference) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/tokenized/checkout/create'),
      headers: {
        'Content-Type': 'application/json',
        'authorization': idToken,
        'x-app-key': _appKey,
      },
      body: jsonEncode({
        "mode": "0000",
        "payerReference": payerReference, // Users Phone Number
        "callbackURL": "https://luckystore.com/bkash_callback"
      }),
    );
    // User is redirected to bkashURL to enter OTP once.
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['bkashURL'];
    }
    return null;
  }

  // 3. Create Payment (Using persistent token, NO OTP required)
  Future<String?> createPayment(String idToken, String agreementId, double amount) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/tokenized/checkout/create'),
      headers: {
        'Content-Type': 'application/json',
        'authorization': idToken,
        'x-app-key': _appKey,
      },
      body: jsonEncode({
        "mode": "0001", // Authorization mode
        "payerReference": "017XXXXXXXX",
        "agreementID": agreementId,
        "amount": amount.toStringAsFixed(2),
        "currency": "BDT",
        "intent": "sale",
        "merchantInvoiceNumber": "INV-12345",
        "callbackURL": "https://luckystore.com/bkash_payment_callback" 
      }),
    );
    
    if (response.statusCode == 200) {
      // Return bkashURL for PIN entry only
      return jsonDecode(response.body)['bkashURL']; 
    }
    return null;
  }

  // 4. Execute Payment (Server-side webhook handler)
  Future<bool> executePayment(String idToken, String paymentId) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/tokenized/checkout/execute'),
      headers: {
        'Content-Type': 'application/json',
        'authorization': idToken,
        'x-app-key': _appKey,
      },
      body: jsonEncode({"paymentID": paymentId}),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['transactionStatus'] == 'Completed';
    }
    return false;
  }
}

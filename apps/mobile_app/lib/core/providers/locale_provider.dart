import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Locale provider for managing app language
class LocaleProvider extends ChangeNotifier {
  static const String _localeKey = 'app_locale';
  
  Locale _locale = const Locale('en');
  
  Locale get locale => _locale;
  
  bool get isBengali => _locale.languageCode == 'bn';
  
  LocaleProvider() {
    _loadLocale();
  }
  
  Future<void> _loadLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final localeCode = prefs.getString(_localeKey) ?? 'en';
    _locale = Locale(localeCode);
    notifyListeners();
  }
  
  Future<void> setLocale(String languageCode) async {
    if (_locale.languageCode == languageCode) return;
    
    _locale = Locale(languageCode);
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_localeKey, languageCode);
    
    notifyListeners();
  }
  
  void toggleLocale() {
    setLocale(isBengali ? 'en' : 'bn');
  }
}

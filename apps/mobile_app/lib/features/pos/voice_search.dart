import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

/// Bangla voice search widget for POS
/// NOTE: speech_to_text disabled due to Flutter 3.29+ incompatibility
class VoiceSearchButton extends StatefulWidget {
  final Function(String) onResult;
  final String localeId;

  const VoiceSearchButton({
    super.key,
    required this.onResult,
    this.localeId = 'bn_BD',
  });

  @override
  State<VoiceSearchButton> createState() => _VoiceSearchButtonState();
}

class _VoiceSearchButtonState extends State<VoiceSearchButton> {
  bool _isListening = false;

  void _showDisabledMessage() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('ভয়েস সার্চ বর্তমানে অনুপলব্ধ')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.surfaceDefault,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.borderDefault),
        ),
        child: Icon(
          Icons.mic_none,
          color: AppColors.textDisabled,
        ),
      ),
      onPressed: _showDisabledMessage,
      tooltip: 'ভয়েস সার্চ (অনুপলব্ধ)',
    );
  }
}

/// Voice search overlay with visual feedback
class VoiceSearchOverlay extends StatelessWidget {
  final bool isListening;
  final String? lastResult;

  const VoiceSearchOverlay({
    super.key,
    required this.isListening,
    this.lastResult,
  });

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink(); // Disabled
  }
}

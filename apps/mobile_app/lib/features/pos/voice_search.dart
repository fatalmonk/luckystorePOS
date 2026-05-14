import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

/// Bangla voice search widget for POS
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
  final SpeechToText _speech = SpeechToText();
  bool _isListening = false;
  bool _isAvailable = false;

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    _isAvailable = await _speech.initialize(
      onError: (error) => debugPrint('Speech error: $error'),
      onStatus: (status) {
        if (status == 'done' || status == 'notListening') {
          setState(() => _isListening = false);
        }
      },
    );
    setState(() {});
  }

  Future<void> _listen() async {
    if (!_isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ভয়েস সার্চ উপলব্ধ নয়')),
      );
      return;
    }

    if (_isListening) {
      await _speech.stop();
      setState(() => _isListening = false);
    } else {
      setState(() => _isListening = true);
      await _speech.listen(
        onResult: (result) {
          if (result.finalResult) {
            widget.onResult(result.recognizedWords);
            setState(() => _isListening = false);
          }
        },
        localeId: widget.localeId,
        listenFor: const Duration(seconds: 10),
        pauseFor: const Duration(seconds: 3),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: _isListening ? AppColors.dangerSubtle : AppColors.surfaceDefault,
          shape: BoxShape.circle,
          border: Border.all(
            color: _isListening ? AppColors.dangerDefault : AppColors.borderDefault,
          ),
        ),
        child: Icon(
          _isListening ? Icons.mic : Icons.mic_none,
          color: _isListening ? AppColors.dangerDefault : AppColors.primaryDefault,
        ),
      ),
      onPressed: _listen,
      tooltip: 'ভয়েস সার্চ (বাংলা)',
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
    if (!isListening) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceDefault,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(26),
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.mic, color: AppColors.dangerDefault, size: 48),
          const SizedBox(height: 8),
          Text(
            'শুনছি...',
            style: AppTextStyles.headingMd,
          ),
          if (lastResult != null) ...[
            const SizedBox(height: 8),
            Text(
              lastResult!,
              style: AppTextStyles.bodyMd.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

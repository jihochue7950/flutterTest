import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/purchase_auth_service.dart';

class PurchaseAuthScreen extends StatefulWidget {
  const PurchaseAuthScreen({super.key});

  @override
  State<PurchaseAuthScreen> createState() => _PurchaseAuthScreenState();
}

class _PurchaseAuthScreenState extends State<PurchaseAuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _orderCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _service = PurchaseAuthService();

  bool _loading = false;
  String? _error;

  static const _pink = Color(0xFFE91E63);

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      final result = await _service.verify(
        _orderCtrl.text.trim(),
        _codeCtrl.text.trim(),
      );
      if (!mounted) return;
      context.push('/purchase/success', extra: result);
    } on PurchaseAuthException catch (e) {
      setState(() { _error = e.message; });
    } catch (_) {
      setState(() { _error = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.'; });
    } finally {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  void dispose() {
    _orderCtrl.dispose();
    _codeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const BackButton(color: Colors.black87),
        title: const Text('구매 인증', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w700)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 헤더
                const Center(child: Text('🔑', style: TextStyle(fontSize: 56))),
                const SizedBox(height: 16),
                Center(
                  child: Text('주문번호 · 인증코드 입력',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text('결제 완료 후 받으신 정보를 입력해주세요',
                    style: TextStyle(color: Colors.grey[500], fontSize: 15)),
                ),
                const SizedBox(height: 40),

                // 주문번호
                _label('주문번호'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _orderCtrl,
                  textCapitalization: TextCapitalization.characters,
                  decoration: _inputDeco(
                    hint: 'ORDER-20260522-0001',
                    prefix: Icons.receipt_long_outlined,
                  ),
                  validator: (v) => (v?.trim().isEmpty ?? true) ? '주문번호를 입력해주세요' : null,
                ),
                const SizedBox(height: 20),

                // 인증코드
                _label('인증코드 (8자리)'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _codeCtrl,
                  textCapitalization: TextCapitalization.characters,
                  maxLength: 8,
                  decoration: _inputDeco(
                    hint: 'A3F8C2D1',
                    prefix: Icons.lock_outline,
                  ),
                  validator: (v) {
                    if (v?.trim().isEmpty ?? true) return '인증코드를 입력해주세요';
                    if ((v?.trim().length ?? 0) < 6) return '올바른 인증코드를 입력해주세요';
                    return null;
                  },
                ),
                const SizedBox(height: 8),

                // 에러
                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEBEE),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Color(0xFFE53935), size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(_error!, style: const TextStyle(color: Color(0xFFE53935), fontSize: 14)),
                        ),
                      ],
                    ),
                  ),

                const SizedBox(height: 32),

                // 인증 버튼
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _pink,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                    ),
                    child: _loading
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                        : const Text('인증하고 프로포즈 시작하기'),
                  ),
                ),

                const SizedBox(height: 32),

                // 도움말
                _helpBox(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(text,
    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1A1A2E)));

  InputDecoration _inputDeco({required String hint, required IconData prefix}) =>
    InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Colors.grey[400], letterSpacing: 1),
      prefixIcon: Icon(prefix, color: Colors.grey[400]),
      filled: true,
      fillColor: const Color(0xFFF8F9FA),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE91E63), width: 2),
      ),
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE53935))),
      focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE53935), width: 2)),
      counterText: '',
    );

  Widget _helpBox() => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: const Color(0xFFF0F4FF),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('💡 어디서 확인하나요?', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        const SizedBox(height: 8),
        _helpRow('주문번호', '결제 완료 안내 문자 또는 이메일 확인'),
        _helpRow('인증코드', '주문 완료 페이지 또는 이메일 확인'),
        _helpRow('앱 사용 가능?', '제작 완료 후 관리자가 앱 접근을 허용하면 이용 가능'),
      ],
    ),
  );

  Widget _helpRow(String label, String desc) => Padding(
    padding: const EdgeInsets.only(top: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('• $label: ', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1A1A2E))),
        Expanded(child: Text(desc, style: const TextStyle(fontSize: 13, color: Color(0xFF555555)))),
      ],
    ),
  );
}

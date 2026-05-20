import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../providers/avatar_provider.dart';
import '../../cast/screens/local_video_player_screen.dart';

// ── Hello Kitty 3D WebView 위젯 ─────────────────────────────────────────────

class _KittyWebView extends StatefulWidget {
  final AvatarMode mode;
  const _KittyWebView({required this.mode});

  @override
  State<_KittyWebView> createState() => _KittyWebViewState();
}

class _KittyWebViewState extends State<_KittyWebView> {
  late final WebViewController _ctrl;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _ctrl = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) {
          _ready = true;
          _ctrl.runJavaScript(
              "if(window.setKittyState) setKittyState('entering');");
        },
      ))
      ..loadHtmlString(_kittyHtml);
  }

  @override
  void didUpdateWidget(_KittyWebView old) {
    super.didUpdateWidget(old);
    if (old.mode != widget.mode && _ready) _sync(widget.mode);
  }

  void _sync(AvatarMode mode) {
    final s = switch (mode) {
      AvatarMode.intro     => 'speaking',
      AvatarMode.speaking  => 'speaking',
      AvatarMode.listening => 'listening',
      AvatarMode.idle      => 'idle',
    };
    _ctrl.runJavaScript("if(window.setKittyState) setKittyState('$s');");
  }

  @override
  Widget build(BuildContext context) => WebViewWidget(controller: _ctrl);
}

// ── Three.js Hello Kitty HTML (raw string) ──────────────────────────────────
// r''' ... ''' : Dart raw string — $ 는 보간되지 않음
const String _kittyHtml = r'''
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{overflow:hidden;background:transparent}
  canvas{display:block;width:100vw;height:100vh}
</style>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script>
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.1,100);
camera.position.set(0,0.6,7.8);camera.lookAt(0,0.3,0);

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xfff0f8,0.85));
const key=new THREE.DirectionalLight(0xffffff,1.3);
key.position.set(3.5,5,4);key.castShadow=true;scene.add(key);
const fill=new THREE.DirectionalLight(0xffbbcc,0.5);fill.position.set(-3,2,3);scene.add(fill);
const rim=new THREE.DirectionalLight(0x9999ff,0.3);rim.position.set(0,-1,-5);scene.add(rim);

const M={
  white: new THREE.MeshStandardMaterial({color:0xFFFBFD,roughness:0.32}),
  pink:  new THREE.MeshStandardMaterial({color:0xFFB8CC,roughness:0.4}),
  red:   new THREE.MeshStandardMaterial({color:0xE02848,roughness:0.38}),
  redD:  new THREE.MeshStandardMaterial({color:0xA81228,roughness:0.4}),
  black: new THREE.MeshStandardMaterial({color:0x140808,roughness:0.3}),
  yellow:new THREE.MeshStandardMaterial({color:0xF0B818,roughness:0.38}),
  wTr:   new THREE.MeshStandardMaterial({color:0x140808,transparent:true,opacity:0.38,roughness:0.5}),
  mouth: new THREE.MeshStandardMaterial({color:0xC02858,side:THREE.DoubleSide,roughness:0.5}),
  shine: new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.05}),
};

const kitty=new THREE.Group(); scene.add(kitty);

const head=new THREE.Mesh(new THREE.SphereGeometry(1,48,48),M.white);
head.position.y=1.22; head.castShadow=true; kitty.add(head);

function makeEar(side){
  const g=new THREE.Group();
  const o=new THREE.Mesh(new THREE.SphereGeometry(0.34,24,24),M.white);
  o.scale.set(0.76,1.5,0.62); o.castShadow=true; g.add(o);
  const i=new THREE.Mesh(new THREE.SphereGeometry(0.20,20,20),M.pink);
  i.scale.set(0.6,1.12,0.34); i.position.z=0.14; g.add(i);
  g.position.set(side*0.64,1.08,0); g.rotation.z=side*0.12; return g;
}
const earL=makeEar(-1); const earR=makeEar(1);
head.add(earL); head.add(earR);

function makeBow(){
  const g=new THREE.Group();
  function wing(s){
    const sh=new THREE.Shape();
    sh.moveTo(0,0);sh.bezierCurveTo(s*0.04,-0.15,s*0.28,-0.17,s*0.25,-0.04);
    sh.bezierCurveTo(s*0.22,0.07,s*0.06,0.05,0,0);
    const m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:0.07,bevelEnabled:true,bevelSize:0.012,bevelThickness:0.012,bevelSegments:3}),M.red);
    m.position.z=-0.035; m.castShadow=true; return m;
  }
  g.add(wing(-1)); g.add(wing(1));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06,16,16),M.redD)); return g;
}
const bowG=makeBow(); bowG.position.set(-0.02,1.18,0.24); bowG.rotation.x=-0.14; earL.add(bowG);

function makeEye(side){
  const g=new THREE.Group();
  const e=new THREE.Mesh(new THREE.SphereGeometry(1,24,24),M.black);
  e.scale.set(0.115,0.14,0.038); g.add(e);
  const hl=new THREE.Mesh(new THREE.SphereGeometry(0.038,10,10),M.shine);
  hl.position.set(0.035,0.065,0.95); g.add(hl);
  g.position.set(side*0.31,0.075,0.96); return g;
}
head.add(makeEye(-1)); head.add(makeEye(1));

const nose=new THREE.Mesh(new THREE.SphereGeometry(0.09,14,14),M.yellow);
nose.scale.set(1.28,0.72,0.42); nose.position.set(0.15,-0.09,0.97); head.add(nose);

function makeWhiskers(side){
  [[-0.13,0.06],[0,0],[0.13,-0.06]].forEach(([a,y])=>{
    const m=new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,0.54,5),M.wTr);
    m.rotation.z=Math.PI/2+a*side; m.position.set(side*0.16,-0.09+y,0.93); head.add(m);
  });
}
makeWhiskers(-1); makeWhiskers(1);

const mSh=new THREE.Shape();
mSh.moveTo(-0.13,0); mSh.quadraticCurveTo(0,0.02,0.13,0); mSh.quadraticCurveTo(0,-0.13,-0.13,0);
const mouthMesh=new THREE.Mesh(new THREE.ShapeGeometry(mSh,12),M.mouth);
mouthMesh.position.set(0,-0.20,0.988); mouthMesh.visible=false; head.add(mouthMesh);

const body=new THREE.Mesh(new THREE.SphereGeometry(0.85,40,40),M.white);
body.scale.set(1,1.06,0.9); body.position.y=-0.66; body.castShadow=true; kitty.add(body);

function makeArm(side){
  const g=new THREE.Group();
  const a=new THREE.Mesh(new THREE.CapsuleGeometry(0.14,0.34,8,16),M.white);
  a.castShadow=true; g.add(a);
  const h=new THREE.Mesh(new THREE.SphereGeometry(0.17,16,16),M.white);
  h.position.y=-0.32; h.castShadow=true; g.add(h);
  g.position.set(side*0.9,-0.3,0.05); g.rotation.z=side*0.3; return g;
}
const armL=makeArm(-1); const armR=makeArm(1);
kitty.add(armL); kitty.add(armR);

function makeLeg(side){
  const g=new THREE.Group();
  const l=new THREE.Mesh(new THREE.CapsuleGeometry(0.19,0.25,8,16),M.white);
  l.castShadow=true; g.add(l);
  const f=new THREE.Mesh(new THREE.SphereGeometry(0.23,20,20),M.white);
  f.scale.set(1.25,0.6,1.38); f.position.set(side*0.04,-0.3,0.08); f.castShadow=true; g.add(f);
  g.position.set(side*0.36,-1.55,0); return g;
}
const legL=makeLeg(-1); const legR=makeLeg(1);
kitty.add(legL); kitty.add(legR);

const tCurve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.55,-0.75,0),new THREE.Vector3(1.05,-0.44,0.1),
  new THREE.Vector3(1.28,0.08,0.2),new THREE.Vector3(0.9,0.52,0.28),
]);
const tail=new THREE.Mesh(new THREE.TubeGeometry(tCurve,24,0.1,10,false),M.white);
tail.castShadow=true; kitty.add(tail);

// State machine
let state='idle', st=0, prevT=performance.now()/1000;
function eio(p){return p<.5?2*p*p:-1+(4-2*p)*p;}

// Exposed to Flutter via JavascriptEvaluation
window.setKittyState=function(s){ state=s; st=0; };

function tick(){
  requestAnimationFrame(tick);
  const now=performance.now()/1000;
  const dt=Math.min(now-prevT,0.05); prevT=now; st+=dt;

  mouthMesh.visible=false;
  head.rotation.x=0; head.rotation.z=0;
  legL.rotation.x=0; legR.rotation.x=0;
  armL.rotation.x=0; armR.rotation.x=0;
  armR.rotation.z=0.3; armL.rotation.z=-0.3;

  if(state==='entering'){
    const DUR=2.1, p=Math.min(st/DUR,1), e=eio(p);
    kitty.position.x=(1-e)*5.8; kitty.rotation.y=Math.PI*0.5;
    const w=st*8;
    legL.rotation.x=Math.sin(w)*0.55; legR.rotation.x=-Math.sin(w)*0.55;
    armL.rotation.x=-Math.sin(w)*0.38; armR.rotation.x=Math.sin(w)*0.38;
    kitty.position.y=Math.abs(Math.sin(w))*0.1-0.05;
    if(p>=1){state='turning';st=0;}

  } else if(state==='turning'){
    const DUR=0.62, p=Math.min(st/DUR,1);
    kitty.rotation.y=Math.PI*0.5*(1-eio(p));
    kitty.position.x=0; kitty.position.y=0;
    if(p>=1){kitty.position.x=0;state='greeting';st=0;}

  } else if(state==='greeting'){
    const DUR=2.4; kitty.rotation.y=0; kitty.position.x=0;
    const p=st/DUR, wave=Math.sin(p*Math.PI*5)*0.42, raise=Math.min(p*3.5,1);
    armR.rotation.z=0.3-raise*1.75-wave*0.38; armR.rotation.x=-raise*0.22;
    head.rotation.x=Math.sin(p*Math.PI)*0.1;
    kitty.position.y=Math.sin(st*3)*0.04; tail.rotation.y=Math.sin(st*3.5)*0.18;
    if(st>=DUR){state='idle';st=0;}

  } else if(state==='idle'){
    kitty.rotation.y=Math.sin(st*0.45)*0.07; kitty.position.y=Math.sin(st*1.6)*0.07;
    kitty.position.x=0; tail.rotation.y=Math.sin(st*2.8)*0.22;
    armR.rotation.z=0.3+Math.sin(st*1.3)*0.05; armL.rotation.z=-0.3+Math.sin(st*1.3+1)*0.05;

  } else if(state==='speaking'){
    kitty.position.y=Math.sin(st*2.0)*0.05; kitty.rotation.y=Math.sin(st*0.5)*0.05;
    mouthMesh.visible=true; mouthMesh.scale.y=0.5+Math.abs(Math.sin(st*8))*1.1;
    head.rotation.x=Math.sin(st*8)*0.038; tail.rotation.y=Math.sin(st*3)*0.2;
    armR.rotation.z=0.3+Math.sin(st*1.5)*0.08; armL.rotation.z=-0.3+Math.sin(st*1.5+1)*0.08;

  } else if(state==='listening'){
    kitty.position.y=Math.sin(st*1.4)*0.06; kitty.rotation.y=Math.sin(st*0.38)*0.06;
    head.rotation.x=-0.09; head.rotation.z=Math.sin(st*1.2)*0.05;
    tail.rotation.y=Math.sin(st*2.5)*0.2;
    armR.rotation.z=0.3+Math.sin(st*1.1)*0.05; armL.rotation.z=-0.3+Math.sin(st*1.1+1)*0.05;
  }

  renderer.render(scene,camera);
}

window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

tick();
</script>
</body>
</html>
''';

// ── TV 전체화면 AI 아바타 화면 ─────────────────────────────────────────────

class AiAvatarScreen extends ConsumerStatefulWidget {
  final String sessionId;
  const AiAvatarScreen({super.key, required this.sessionId});

  @override
  ConsumerState<AiAvatarScreen> createState() => _AiAvatarScreenState();
}

class _AiAvatarScreenState extends ConsumerState<AiAvatarScreen> {
  VideoPlayerController? _preloadedController;

  @override
  void initState() {
    super.initState();
    _preloadVideo();
  }

  Future<void> _preloadVideo() async {
    final ctrl = VideoPlayerController.asset('assets/video/proposal.mp4');
    try {
      await ctrl.initialize();
      ctrl.setLooping(false);
      if (mounted) {
        _preloadedController = ctrl;
      } else {
        ctrl.dispose();
      }
    } catch (_) {
      ctrl.dispose();
    }
  }

  @override
  void dispose() {
    _preloadedController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final avatar = ref.watch(avatarProvider(widget.sessionId));

    ref.listen<AvatarState>(avatarProvider(widget.sessionId), (prev, next) {
      if (prev?.shouldPlayVideo == false && next.shouldPlayVideo && mounted) {
        final preloaded = _preloadedController;
        _preloadedController = null;
        Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => LocalVideoPlayerScreen(
            videoUrl: next.videoUrl,
            preloadedController: preloaded,
            afterScreen: const _CongratsScreen(),
          ),
          fullscreenDialog: true,
        ));
      }
    });

    // 시작 전: "대화 시작" 버튼 화면
    if (!avatar.hasStarted) {
      return Scaffold(
        backgroundColor: const Color(0xFF080810),
        body: Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.center,
              radius: 1.2,
              colors: [Color(0xFF1A1A3E), Color(0xFF050508)],
            ),
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Hello Kitty AI',
                    style: TextStyle(color: Colors.white38, fontSize: 14,
                        letterSpacing: 2)),
                const SizedBox(height: 40),
                Text(
                  avatar.isConnected ? '서버 연결됨 · 준비 완료' : '서버 연결 중...',
                  style: TextStyle(
                    color: avatar.isConnected ? Colors.greenAccent : Colors.white38,
                    fontSize: 13),
                ),
                const SizedBox(height: 48),
                ElevatedButton.icon(
                  onPressed: () =>
                      ref.read(avatarProvider(widget.sessionId).notifier).startIntro(),
                  icon: const Icon(Icons.play_arrow_rounded, size: 26),
                  label: const Text('대화 시작',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE91E8C),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(32)),
                    elevation: 8,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF080810),
      body: Stack(
        children: [
          // 3D Hello Kitty (전체화면 WebView)
          Positioned.fill(
            child: _KittyWebView(mode: avatar.mode),
          ),

          // 우상단 연결 상태
          Positioned(
            top: 24, right: 24,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8, height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: avatar.isConnected ? Colors.greenAccent : Colors.redAccent,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  avatar.isConnected ? 'LIVE' : 'OFFLINE',
                  style: TextStyle(
                    color: avatar.isConnected ? Colors.greenAccent : Colors.redAccent,
                    fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.8,
                  ),
                ),
              ],
            ),
          ),

          // 하단 대사 텍스트 버블
          Positioned(
            left: 32, right: 32, bottom: 80,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 400),
              child: avatar.displayText.isEmpty
                  ? const SizedBox.shrink()
                  : Container(
                      key: ValueKey(avatar.displayText),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 28, vertical: 16),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: Colors.white.withValues(alpha: 0.12)),
                      ),
                      child: Text(
                        avatar.displayText,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white, fontSize: 20,
                          fontWeight: FontWeight.w300, height: 1.6,
                        ),
                      ),
                    ),
            ),
          ),

          // 하단 모드 뱃지
          Positioned(
            bottom: 28, left: 0, right: 0,
            child: Center(child: _ModeBadge(mode: avatar.mode)),
          ),
        ],
      ),
    );
  }
}

// ── 모드 뱃지 ────────────────────────────────────────────────────────────────

class _ModeBadge extends StatelessWidget {
  final AvatarMode mode;
  const _ModeBadge({required this.mode});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (mode) {
      AvatarMode.intro     => ('자기소개 중', const Color(0xFF9C27B0)),
      AvatarMode.speaking  => ('AI 응답 중', const Color(0xFFE91E8C)),
      AvatarMode.listening => ('대화 대기 중', const Color(0xFF00BCD4)),
      AvatarMode.idle      => ('연결 대기 중', Colors.grey),
    };
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: Container(
        key: ValueKey(mode),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Text(label,
            style: TextStyle(color: color, fontSize: 12,
                fontWeight: FontWeight.w600, letterSpacing: 0.5)),
      ),
    );
  }
}

// ── 영상 종료 후 축하 화면 ────────────────────────────────────────────────────

class _CongratsScreen extends StatefulWidget {
  const _CongratsScreen();
  @override
  State<_CongratsScreen> createState() => _CongratsScreenState();
}

class _CongratsScreenState extends State<_CongratsScreen>
    with TickerProviderStateMixin {
  late AnimationController _fadeCtrl;
  late AnimationController _heartCtrl;
  late AnimationController _floatCtrl;
  late Animation<double> _fadeAnim;
  late Animation<double> _floatAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl  = AnimationController(vsync:this, duration:const Duration(milliseconds:1800));
    _heartCtrl = AnimationController(vsync:this, duration:const Duration(milliseconds:800))..repeat(reverse:true);
    _floatCtrl = AnimationController(vsync:this, duration:const Duration(milliseconds:3000))..repeat(reverse:true);
    _fadeAnim  = CurvedAnimation(parent:_fadeCtrl, curve:Curves.easeIn);
    _floatAnim = CurvedAnimation(parent:_floatCtrl, curve:Curves.easeInOut);
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose(); _heartCtrl.dispose(); _floatCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FadeTransition(
        opacity: _fadeAnim,
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: [Color(0xFF1A0030), Color(0xFF3D0060), Color(0xFF700040)],
            ),
          ),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedBuilder(
                  animation: _heartCtrl,
                  builder: (_, __) => Transform.scale(
                    scale: 1.0 + 0.12 * _heartCtrl.value,
                    child: const Text('💍', style: TextStyle(fontSize: 96)),
                  ),
                ),
                const SizedBox(height: 32),
                const Text('결혼을 축하합니다!',
                    style: TextStyle(color: Colors.white, fontSize: 42,
                        fontWeight: FontWeight.w700, letterSpacing: 2)),
                const SizedBox(height: 20),
                AnimatedBuilder(
                  animation: _floatAnim,
                  builder: (_, child) => Transform.translate(
                    offset: Offset(0, -8 * _floatAnim.value), child: child),
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 560),
                    child: const Text(
                      '두 분의 새로운 시작을 진심으로 축하드립니다.\n앞으로 행복한 날들이 가득하시길 바랍니다.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70, fontSize: 20,
                          fontWeight: FontWeight.w300, height: 1.75),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
                const Text('🌸   🤍   🌸',
                    style: TextStyle(fontSize: 36, letterSpacing: 12)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

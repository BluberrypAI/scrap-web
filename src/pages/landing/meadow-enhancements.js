// 홈 화면 3D 장면 보강: 그라데이션 하늘, 원경 산 능선.
// MeadowShowcase에서만 사용하며, 이 파일과 호출부를 빼면 원래 장면으로 돌아감.

const hexToVec3 = (THREE, hex) => {
  const value = parseInt(hex.replace('#', ''), 16);
  return new THREE.Vector3(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
};

/**
 * 카메라를 감싸는 하늘 돔. 지평선(밝은 안개색) → 머리 위(진한 파랑) 그라데이션에
 * 왼쪽 위로 따뜻한 햇빛 번짐을 더함. 색은 sRGB 값을 그대로 출력(톤 매핑 미적용).
 */
export function createSkyDome(THREE, viewYaw) {
  const sunYaw = viewYaw - THREE.MathUtils.degToRad(42);
  const sunPitch = THREE.MathUtils.degToRad(4);
  const sunDir = new THREE.Vector3(
    Math.sin(sunYaw) * Math.cos(sunPitch), Math.sin(sunPitch), Math.cos(sunYaw) * Math.cos(sunPitch),
  );
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: {
      haze: { value: hexToVec3(THREE, '#d6ecf8') },
      horizon: { value: hexToVec3(THREE, '#97cbf3') },
      zenith: { value: hexToVec3(THREE, '#5b9de4') },
      sunColor: { value: hexToVec3(THREE, '#fff1d4') },
      sunDir: { value: sunDir },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 haze; uniform vec3 horizon; uniform vec3 zenith; uniform vec3 sunColor; uniform vec3 sunDir;
      varying vec3 vDir;
      void main() {
        vec3 dir = normalize(vDir);
        float e = degrees(asin(clamp(dir.y, -1.0, 1.0)));
        vec3 color = mix(haze, horizon, smoothstep(-11.0, -1.0, e));
        color = mix(color, zenith, smoothstep(-1.0, 28.0, e));
        float sun = max(dot(dir, normalize(sunDir)), 0.0);
        color = mix(color, sunColor, pow(sun, 6.0) * 0.55 + pow(sun, 48.0) * 0.35);
        gl_FragColor = vec4(color, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(220, 32, 16), material);
  mesh.name = 'Sky dome';
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * 언덕 너머로 살짝 보이는 산 능선 두 겹. 카메라 기준 원호 위에 세운 실루엣 면이며,
 * 먼 겹일수록 안개에 더 묻혀 공기원근감이 생김.
 */
export function createDistantRanges(THREE, cameraPosition, viewYaw) {
  const group = new THREE.Group();
  group.name = 'Distant ranges';
  const layers = [
    { radius: 192, color: '#7f9fc2', low: -6.4, high: -2.6, seed: 1.7 },
    { radius: 150, color: '#5f8f88', low: -8.6, high: -5.0, seed: 4.1 },
  ];
  layers.forEach(({ radius, color, low, high, seed }) => {
    const span = THREE.MathUtils.degToRad(80), steps = 160;
    const vertices = [], indices = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const yaw = viewYaw - span + t * span * 2;
      // 여러 사인파를 겹쳐 봉우리 모양을 만들고, 가운데(헤드라인 뒤)는 조금 낮춤
      const ridge = 0.5 + 0.28 * Math.sin(t * 9.0 + seed) + 0.16 * Math.sin(t * 23.0 + seed * 2.3)
        + 0.07 * Math.sin(t * 61.0 + seed * 5.1);
      const center = Math.exp(-(((t - 0.5) / 0.16) ** 2)) * 0.35;
      const elevation = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(low, high, THREE.MathUtils.clamp(ridge - center, 0, 1)));
      const x = cameraPosition.x + Math.sin(yaw) * radius;
      const z = cameraPosition.z + Math.cos(yaw) * radius;
      vertices.push(x, cameraPosition.y + Math.tan(elevation) * radius, z, x, -70, z);
      if (i < steps) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    group.add(mesh);
  });
  return group;
}

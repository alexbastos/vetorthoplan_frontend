const videoVertexShader = /* glsl */ `
  precision highp float;

  attribute vec3 position;
  attribute vec2 uv;

  varying vec2 vUv;

  uniform float u_scale;
  uniform vec2 u_offset;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * u_scale + u_offset, 0.0, 1.0);
  }
`

const videoFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D u_texture;
  uniform float u_viewAspect;
  uniform float u_texAspect;

  void main() {
    vec2 uv = vUv;

    if (u_texAspect > u_viewAspect) {
      uv.x = 0.5 + (vUv.x - 0.5) * (u_viewAspect / u_texAspect);
    } else {
      uv.y = 0.5 + (vUv.y - 0.5) * (u_texAspect / u_viewAspect);
    }

    gl_FragColor = texture2D(u_texture, uv);
  }
`

const lineVertexShader = /* glsl */ `
  precision highp float;

  attribute vec3 position;
  attribute vec2 uv;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const lineFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D u_texture;
  uniform vec2 u_resolutionPixels;
  uniform float u_resolution;
  uniform float u_lineScale;
  uniform float u_contrast;
  uniform float u_blankSpots;
  uniform float u_showGaps;
  uniform float u_capRoundness;
  uniform float u_gapCell;
  uniform float u_vertical;
  uniform float u_invert;
  uniform vec3 u_lineColors[4];

  float sampleLuminance(vec2 sampleCell, vec2 cellCount, vec2 cellSize) {
    if (
      sampleCell.x < 0.0 || sampleCell.y < 0.0 ||
      sampleCell.x >= cellCount.x || sampleCell.y >= cellCount.y
    ) {
      return -1.0;
    }

    vec2 sampleUv = (sampleCell + 0.5) * cellSize;
    vec3 texel = texture2D(u_texture, clamp(sampleUv, 0.0, 1.0)).rgb;
    float luminance = dot(texel, vec3(0.299, 0.587, 0.114));
    luminance = clamp((luminance - 0.5) * u_contrast + 0.5, 0.0, 1.0);

    return mix(luminance, 1.0 - luminance, u_invert);
  }

  vec2 sampleCellThickness(vec2 sampleCell, vec2 cellCount, vec2 cellSize) {
    float luminance = sampleLuminance(sampleCell, cellCount, cellSize);

    if (luminance < 0.0 || (u_blankSpots > 0.5 && luminance < 0.2)) {
      return vec2(0.0, 1.0);
    }

    if (luminance < 0.4) return vec2(0.0625 * u_lineScale, 0.0);
    if (luminance < 0.6) return vec2(0.25 * u_lineScale, 0.0);
    if (luminance < 0.8) return vec2(0.375 * u_lineScale, 0.0);
    return vec2(0.5 * u_lineScale, 0.0);
  }

  vec3 lineColor(float luminance) {
    if (luminance < 0.4) return u_lineColors[0];
    if (luminance < 0.6) return u_lineColors[1];
    if (luminance < 0.8) return u_lineColors[2];
    return u_lineColors[3];
  }

  bool thicknessMatches(vec2 a, vec2 b) {
    if (a.y > 0.5 && b.y > 0.5) return true;
    if (a.y > 0.5 || b.y > 0.5) return false;
    return abs(a.x - b.x) < 0.001;
  }

  void main() {
    vec2 cellCount = max(u_resolutionPixels * u_resolution, vec2(1.0));
    vec2 cellSize = 1.0 / cellCount;
    vec2 cell = floor(vUv / cellSize);
    vec2 inCell = (vUv - cell * cellSize) / cellSize;
    vec2 t0 = sampleCellThickness(cell, cellCount, cellSize);

    float along = mix(inCell.x, inCell.y, u_vertical);
    float acrossSigned = mix(inCell.y, inCell.x, u_vertical) - 0.5;
    float across = abs(acrossSigned);
    float crossInk = 1.0 - smoothstep(t0.x, t0.x + 0.02, across);
    float inLine = crossInk;

    if (u_showGaps > 0.5) {
      vec2 dPrev = mix(vec2(-1.0, 0.0), vec2(0.0, -1.0), u_vertical);
      vec2 dNext = mix(vec2(1.0, 0.0), vec2(0.0, 1.0), u_vertical);
      vec2 tPrev = sampleCellThickness(cell + dPrev, cellCount, cellSize);
      vec2 tNext = sampleCellThickness(cell + dNext, cellCount, cellSize);
      bool samePrev = thicknessMatches(t0, tPrev);
      bool sameNext = thicknessMatches(t0, tNext);
      float gap = u_gapCell;
      float y0 = samePrev ? 0.0 : gap * 0.5;
      float y1 = sameNext ? 1.0 : 1.0 - gap * 0.5;
      float radius = max(t0.x, 0.0001);
      float rounding = radius * clamp(u_capRoundness, 0.0, 1.0);
      float signedAcross = acrossSigned;
      float loRect = samePrev ? 0.0 : y0 + rounding;
      float hiRect = sameNext ? 1.0 : y1 - rounding;
      float rectInk = 0.0;

      if (loRect <= hiRect + 0.0001 && along >= loRect && along <= hiRect) {
        rectInk = crossInk;
      }

      float bottomInk = 0.0;
      if (!samePrev && t0.x > 0.0001 && t0.y < 0.5 && rounding > 0.00001) {
        if (along >= y0 && along <= y0 + rounding) {
          float central = 1.0 - smoothstep(radius - rounding, radius - rounding + 0.02, across);
          vec2 rightCenter = vec2(radius - rounding, y0 + rounding);
          float rightDistance = length(vec2(signedAcross, along) - rightCenter);
          float right = (1.0 - smoothstep(rounding, rounding + 0.02, rightDistance))
            * step(radius - rounding - 0.0001, signedAcross);
          vec2 leftCenter = vec2(-(radius - rounding), y0 + rounding);
          float leftDistance = length(vec2(signedAcross, along) - leftCenter);
          float left = (1.0 - smoothstep(rounding, rounding + 0.02, leftDistance))
            * (1.0 - step(-(radius - rounding) + 0.0001, signedAcross));
          bottomInk = max(max(central, right), left) * crossInk;
        }
      }

      float topInk = 0.0;
      if (!sameNext && t0.x > 0.0001 && t0.y < 0.5 && rounding > 0.00001) {
        if (along <= y1 && along >= y1 - rounding) {
          float central = 1.0 - smoothstep(radius - rounding, radius - rounding + 0.02, across);
          vec2 rightCenter = vec2(radius - rounding, y1 - rounding);
          float rightDistance = length(vec2(signedAcross, along) - rightCenter);
          float right = (1.0 - smoothstep(rounding, rounding + 0.02, rightDistance))
            * step(radius - rounding - 0.0001, signedAcross);
          vec2 leftCenter = vec2(-(radius - rounding), y1 - rounding);
          float leftDistance = length(vec2(signedAcross, along) - leftCenter);
          float left = (1.0 - smoothstep(rounding, rounding + 0.02, leftDistance))
            * (1.0 - step(-(radius - rounding) + 0.0001, signedAcross));
          topInk = max(max(central, right), left) * crossInk;
        }
      }

      inLine = max(max(rectInk, bottomInk), topInk);
    }

    if (t0.y > 0.5) inLine = 0.0;

    float luminance = sampleLuminance(cell, cellCount, cellSize);
    vec3 color = lineColor(max(luminance, 0.0));
    gl_FragColor = vec4(color * inLine, inLine);
  }
`

export { lineFragmentShader, lineVertexShader, videoFragmentShader, videoVertexShader }

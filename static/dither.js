// Adapted from Svelte Bits Dither; shader credits and terms in dither-LICENSE.txt.
const container = document.querySelector(".home-dither");

if (container) {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
    if (gl) installDither(gl, canvas, container);
}

function installDither(gl, canvas, container) {
    const vertexSource = `#version 300 es
    void main() {
        vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
        gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;
    const fragmentSource = `#version 300 es
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    uniform vec3 waveColor;
    uniform vec3 backgroundColor;
    out vec4 outColor;

    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }
    float cnoise(vec2 P) {
        vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
        vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
        Pi = mod289(Pi);
        vec4 ix = Pi.xzxz;
        vec4 iy = Pi.yyww;
        vec4 fx = Pf.xzxz;
        vec4 fy = Pf.yyww;
        vec4 i = permute(permute(ix) + iy);
        vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
        vec4 gy = abs(gx) - 0.5;
        vec4 tx = floor(gx + 0.5);
        gx = gx - tx;
        vec2 g00 = vec2(gx.x, gy.x);
        vec2 g10 = vec2(gx.y, gy.y);
        vec2 g01 = vec2(gx.z, gy.z);
        vec2 g11 = vec2(gx.w, gy.w);
        vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
        g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
        float n00 = dot(g00, vec2(fx.x, fy.x));
        float n10 = dot(g10, vec2(fx.y, fy.y));
        float n01 = dot(g01, vec2(fx.z, fy.z));
        float n11 = dot(g11, vec2(fx.w, fy.w));
        vec2 fade_xy = fade(Pf.xy);
        vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
        return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
    }
    float fbm(vec2 p) {
        float value = 0.0;
        float amp = 1.0;
        for (int i = 0; i < 4; i++) {
            value += amp * abs(cnoise(p));
            p *= 3.0;
            amp *= 0.3;
        }
        return value;
    }
    const float bayer[64] = float[64](
         0., 48., 12., 60.,  3., 51., 15., 63.,
        32., 16., 44., 28., 35., 19., 47., 31.,
         8., 56.,  4., 52., 11., 59.,  7., 55.,
        40., 24., 36., 20., 43., 27., 39., 23.,
         2., 50., 14., 62.,  1., 49., 13., 61.,
        34., 18., 46., 30., 33., 17., 45., 29.,
        10., 58.,  6., 54.,  9., 57.,  5., 53.,
        42., 26., 38., 22., 41., 25., 37., 21.
    );
    void main() {
        vec2 pixel = floor(gl_FragCoord.xy);
        vec2 uv = pixel / resolution - 0.5;
        uv.x *= resolution.x / resolution.y;
        float f = fbm(uv + fbm(uv - time * 0.05));
        ivec2 cell = ivec2(mod(pixel, 8.0));
        float threshold = bayer[cell.y * 8 + cell.x] / 64.0 - 0.25;
        float shade = floor(clamp(f + threshold / 3.0 - 0.2, 0.0, 1.0) * 3.0 + 0.5) / 3.0;
        outColor = vec4(mix(backgroundColor, waveColor, shade), 1.0);
    }`;

    const program = gl.createProgram();
    function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (compiled) gl.attachShader(program, shader);
        else console.warn("Dither shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return compiled;
    }
    if (!compile(gl.VERTEX_SHADER, vertexSource) || !compile(gl.FRAGMENT_SHADER, fragmentSource)) {
        gl.deleteProgram(program);
        return;
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn("Dither program:", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return;
    }
    gl.useProgram(program);
    const uniforms = Object.fromEntries(["resolution", "time", "waveColor", "backgroundColor"]
        .map((name) => [name, gl.getUniformLocation(program, name)]));
    container.append(canvas);

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const theme = matchMedia("(prefers-color-scheme: light)");
    let visible = true;
    let lost = false;
    let frame = 0;
    let lastTime = 0;
    let time = 0;

    function draw(now = performance.now()) {
        frame = 0;
        if (lastTime) time += Math.min(now - lastTime, 64) / 1000;
        lastTime = now;
        gl.uniform1f(uniforms.time, time);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!motion.matches) frame = requestAnimationFrame(draw);
    }

    function sync() {
        cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
        if (!lost && visible && !document.hidden && container.clientWidth && container.clientHeight) draw();
    }

    function colors() {
        if (lost) return;
        const style = getComputedStyle(container);
        const rgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map((channel) => Number(channel) / 255);
        gl.uniform3fv(uniforms.waveColor, rgb(style.color));
        gl.uniform3fv(uniforms.backgroundColor, rgb(style.backgroundColor));
        sync();
    }

    function resize() {
        // One framebuffer pixel per 2 CSS pixels preserves the source's pixelSize=2.
        canvas.width = Math.max(1, Math.round(container.clientWidth / 2));
        canvas.height = Math.max(1, Math.round(container.clientHeight / 2));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
        sync();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
    });
    intersectionObserver.observe(container);

    motion.addEventListener("change", sync);
    theme.addEventListener("change", colors);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", () => {
        cancelAnimationFrame(frame);
        lastTime = 0;
    });
    window.addEventListener("pageshow", sync);
    canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        lost = true;
        canvas.hidden = true;
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        sync();
    });
    resize();
    colors();
}

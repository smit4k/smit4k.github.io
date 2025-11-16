(function() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Create donut container
        const donutContainer = document.createElement('div');
        donutContainer.id = 'donut-container';
        document.body.appendChild(donutContainer);

        // Create pre element for ASCII art
        const donutPre = document.createElement('pre');
        donutPre.id = 'donut';
        donutContainer.appendChild(donutPre);

        startAnimation();
    }

    function startAnimation() {

        const donutPre = document.getElementById('donut');
        const width = 60;
        const height = 22;
        
        let A = 0, B = 0;
        
        function render() {
            const output = [];
            const zbuffer = [];
            
            // Initialize buffers
            for (let i = 0; i < width * height; i++) {
                output[i] = ' ';
                zbuffer[i] = 0;
            }
            
            // Render the donut
            for (let theta = 0; theta < 6.28; theta += 0.07) {
                for (let phi = 0; phi < 6.28; phi += 0.02) {
                    const sinA = Math.sin(A), cosA = Math.cos(A);
                    const sinB = Math.sin(B), cosB = Math.cos(B);
                    
                    const sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);
                    const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
                    
                    const circleX = cosTheta + 2;
                    const circleY = sinTheta;
                    
                    const x = circleX * (cosB * cosPhi + sinA * sinB * sinPhi) - circleY * cosA * sinB;
                    const y = circleX * (sinB * cosPhi - sinA * cosB * sinPhi) + circleY * cosA * cosB;
                    const z = cosA * circleX * sinPhi + circleY * sinA + 5;
                    const ooz = 1 / z;
                    
                    const xp = Math.floor(width / 2 + 22 * ooz * x);
                    const yp = Math.floor(height / 2 - 11 * ooz * y);
                    
                    const idx = xp + width * yp;
                    
                    const L = cosPhi * cosTheta * sinB - cosA * cosTheta * sinPhi - 
                              sinA * sinTheta + cosB * (cosA * sinTheta - cosTheta * sinA * sinPhi);
                    
                    if (yp >= 0 && yp < height && xp >= 0 && xp < width && ooz > zbuffer[idx]) {
                        zbuffer[idx] = ooz;
                        const luminance = Math.floor(L * 8);
                        output[idx] = '.,-~:;=!*#$@'[Math.max(luminance, 0)];
                    }
                }
            }
            
            // Convert output array to string
            let result = '';
            for (let i = 0; i < height; i++) {
                result += output.slice(i * width, (i + 1) * width).join('') + '\n';
            }
            
            donutPre.textContent = result;
            
            A += 0.04;
            B += 0.02;
        }
        
        // Render at 30 FPS
        setInterval(render, 33);
    }
})();

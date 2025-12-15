
export default class Wavis {
    constructor(audioElement) {
        this.audioElement = audioElement;
        this.audioCtx = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.timeDataArray = null; // New array for waveform data
        this.bufferLength = 0;
        
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        
        // Visualizer state
        this.hue = 240; // Start at blue-ish
        
        this.visualizers = {};
        this.currentVisualizer = 'bars'; 
        this.presets = this.getPresets();
        
        // Bind handlers once to avoid memory leaks
        this.resize = this.resize.bind(this);
        
        // Initialize presets
        Object.keys(this.presets).forEach(key => {
            this.addVisualizer(key, this.presets[key]);
        });
    }

    getVisualizers() {
        return Object.keys(this.visualizers);
    }

    init() {
        if (this.audioCtx) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.85; // Smoother transition

        try {
            // Check if source already exists to avoid error
            if (!this.source) {
                // If the element already has a source connected in a previous instance, reuse or re-create carefully
                // For simplicity in React, usually we assume clean mount/unmount
                if (this.audioElement._wavisSource) {
                     this.source = this.audioElement._wavisSource;
                } else {
                     this.source = this.audioCtx.createMediaElementSource(this.audioElement);
                     this.audioElement._wavisSource = this.source;
                }
                
                // Connect to analyser
                this.source.connect(this.analyser);
                // Connect analyser to destination (speakers)
                this.analyser.connect(this.audioCtx.destination);
            }
        } catch (e) {
            console.warn("Wavis: Media source already connected or CORS error", e);
        }

        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.timeDataArray = new Uint8Array(this.bufferLength); // Initialize time domain array
    }

    mount(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', this.resize);
        this.init(); // Ensure init happens
    }

    unmount() {
        this.stop();
        window.removeEventListener('resize', this.resize);
        this.canvas = null;
        this.ctx = null;
    }

    resize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    addVisualizer(name, renderFn) {
        this.visualizers[name] = renderFn;
    }

    setVisualizer(name) {
        if (this.visualizers[name]) {
            this.currentVisualizer = name;
        }
    }

    start() {
        this.init();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        if (!this.animationId) {
            this.animate();
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        if (!this.canvas || !this.ctx || !this.analyser) {
            this.stop();
            return;
        }

        this.animationId = requestAnimationFrame(this.animate.bind(this));

        // Update Frequency Data (for spectrum visualizers)
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Update Time Domain Data (for waveform/oscilloscope)
        this.analyser.getByteTimeDomainData(this.timeDataArray);
        
        // Update Color Hue
        this.hue = (this.hue + 0.2) % 360;

        // Clear Canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render current visualizer
        const renderFn = this.visualizers[this.currentVisualizer];
        if (renderFn) {
            this.ctx.save();
            // Reset common styles
            this.ctx.shadowBlur = 0;
            this.ctx.globalCompositeOperation = 'source-over';
            
            // Pass 'this' as instance to allow visualizers to access class props (like timeDataArray)
            renderFn(this.ctx, this.canvas, this.dataArray, this.bufferLength, this.hue, this);
            this.ctx.restore();
        }
    }

    getPresets() {
        return {
            bars: (ctx, canvas, data, len, hue) => {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const barWidth = (canvas.width / len) * 8; 
                let x = 0;
                
                const gradient = ctx.createLinearGradient(0, cy + 200, 0, cy - 200);
                gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
                gradient.addColorStop(0.5, `hsl(${hue + 60}, 100%, 60%)`);
                gradient.addColorStop(1, '#ffffff');
                ctx.fillStyle = gradient;
                
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsl(${hue + 60}, 100%, 50%)`;

                const usefulLen = Math.floor(len * 0.7);

                for (let i = 0; i < usefulLen; i++) {
                    const value = data[i];
                    const barHeight = (value / 255) * (canvas.height * 0.6);
                    
                    if (barHeight > 0) {
                        ctx.fillRect(cx + x, cy - barHeight / 2, barWidth, barHeight);
                        ctx.fillRect(cx - x - barWidth, cy - barHeight / 2, barWidth, barHeight);
                    }
                    x += barWidth + 1;
                }
            },
            
            wave: (ctx, canvas, data, len, hue) => {
                ctx.lineWidth = 3;
                ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                ctx.shadowBlur = 15;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;

                ctx.beginPath();
                
                const sliceWidth = canvas.width / (len * 0.4);
                let x = 0;

                for(let i = 0; i < len * 0.4; i++) {
                    const v = data[i] / 255.0;
                    const y = (canvas.height / 2) + Math.sin(i * 0.1) * (v * canvas.height * 0.4);
                    
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);

                    x += sliceWidth;
                }
                
                ctx.stroke();
            },

            circle: (ctx, canvas, data, len, hue) => {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const radius = Math.min(cx, cy) * 0.3;
                
                ctx.translate(cx, cy);
                
                const bars = 180;
                const step = (Math.PI * 2) / bars;
                
                for (let i = 0; i < bars; i++) {
                    const dataIndex = Math.floor(i * (len / 2) / bars);
                    const value = data[dataIndex];
                    const barHeight = (value / 255) * 200;
                    
                    ctx.save();
                    ctx.rotate(i * step);
                    
                    const barHue = (hue + (i * 2)) % 360;
                    ctx.fillStyle = `hsl(${barHue}, 100%, 60%)`;
                    
                    if (barHeight > 5) {
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = `hsl(${barHue}, 100%, 50%)`;
                        ctx.fillRect(0, radius, 4, barHeight); 
                    }
                    
                    ctx.restore();
                }
            },

            dots: (ctx, canvas, data, len, hue, instance) => {
                const timeData = instance.timeDataArray;
                if (!timeData) return;
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const maxRadius = Math.min(cx, cy) * 0.9;
                
                let bass = 0;
                for(let i=0; i<10; i++) bass += timeData[i];
                bass = bass / 10;
                
                ctx.beginPath();
                ctx.arc(cx, cy, maxRadius * 0.2 + (bass * 0.8), 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue + 180}, 100%, 50%, ${bass/1000})`;
                ctx.fill();

                const particles = 60; 
                for (let i = 0; i <= particles; i++) {
                    const dataIndex = Math.floor(i * (len / 3) / particles);
                    const value = timeData[dataIndex];
                    
                    const angle = (i / particles) * Math.PI; 
                    const dist = (maxRadius * 0.3) + (value / 255) * (maxRadius * 0.5);
                    const size = (value / 255) * 8;
                    const color = `hsl(${hue + (i * 2)}, 100%, 70%)`; 
                    const shadow = value > 150 ? `hsl(${hue + (i * 2)}, 100%, 50%)` : null;

                    const drawDot = (ang) => {
                        const x = cx + Math.cos(ang) * dist;
                        const y = cy + Math.sin(ang) * dist;
                        ctx.beginPath();
                        ctx.arc(x, y, size, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.shadowBlur = shadow ? 8 : 0;
                        if(shadow) ctx.shadowColor = shadow;
                        ctx.fill();
                    };

                    drawDot(angle);
                    if (i > 0 && i < particles) {
                        drawDot(-angle);
                    }
                }
            },

            shockwave: (ctx, canvas, data, len, hue) => {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                
                let bass = 0;
                for(let i=0; i<20; i++) bass += data[i];
                bass /= 20;
                const normBass = bass / 255; 

                ctx.translate(cx, cy);
                
                ctx.beginPath();
                const coreSize = 50 + (normBass * 100);
                ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
                ctx.shadowBlur = 30;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                ctx.fill();
                
                ctx.save();
                ctx.rotate(Date.now() / 2000);
                ctx.beginPath();
                const ringRadius = coreSize + 40;
                
                const segments = 120;
                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    const dataIdx = 40 + i; 
                    const val = data[dataIdx] || 0;
                    
                    const r = ringRadius + (val * 0.5);
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.lineWidth = 4;
                ctx.strokeStyle = `hsl(${hue + 180}, 100%, 70%)`;
                ctx.shadowBlur = 15;
                ctx.shadowColor = `hsl(${hue + 180}, 100%, 60%)`;
                ctx.stroke();
                ctx.restore();

                const beams = 12;
                for(let i=0; i<beams; i++) {
                    ctx.save();
                    ctx.rotate((Math.PI * 2 / beams) * i);
                    
                    const highFreqVal = data[200 + i * 5]; 
                    if (highFreqVal > 100) {
                        const beamLen = highFreqVal * 1.5;
                        ctx.fillStyle = `hsla(${hue + 60}, 100%, 80%, ${highFreqVal/255})`;
                        ctx.shadowBlur = 20;
                        ctx.shadowColor = 'white';
                        ctx.fillRect(ringRadius + 20, -2, beamLen, 4);
                    }
                    ctx.restore();
                }
            },

            ncs_waveform: (ctx, canvas, data, len, hue, instance) => {
                const timeData = instance.timeDataArray;
                if (!timeData) return;

                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const minDim = Math.min(canvas.width, canvas.height);
                const radius = minDim * 0.25;

                ctx.translate(cx, cy);
                ctx.rotate(Date.now() / 6000);

                const primaryBlue = 'hsl(210, 100%, 60%)';
                const highlightCyan = 'hsl(190, 100%, 75%)';

                ctx.lineWidth = 3;
                ctx.lineJoin = 'round';
                ctx.shadowBlur = 25;
                ctx.shadowColor = primaryBlue;

                const drawHalf = (mirror) => {
                    ctx.beginPath();
                    const usedLen = Math.floor(len * 0.8);
                    
                    for (let i = 0; i < usedLen; i++) {
                        const v = timeData[i];
                        const norm = (v - 128) / 128.0; 
                        
                        const angleStep = Math.PI / (usedLen - 1);
                        let angle = i * angleStep;
                        
                        if (mirror) {
                            angle = (Math.PI * 2) - angle;
                        }

                        const amp = radius * 0.6;
                        const r = radius + (norm * amp);

                        const x = Math.cos(angle) * r;
                        const y = Math.sin(angle) * r;

                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = mirror ? highlightCyan : primaryBlue;
                    ctx.stroke();
                };

                drawHalf(false);
                drawHalf(true);

                ctx.fillStyle = 'white';
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'white';

                const drawParticles = (mirror) => {
                    const usedLen = Math.floor(len * 0.8);
                    for (let i = 0; i < usedLen; i += 12) {
                        const v = timeData[i];
                        const norm = (v - 128) / 128.0;
                        
                        if (Math.abs(norm) > 0.15) {
                            let angle = i * (Math.PI / (usedLen - 1));
                            if (mirror) angle = (Math.PI * 2) - angle;

                            const r = radius + (norm * radius * 0.7);
                            const x = Math.cos(angle) * r;
                            const y = Math.sin(angle) * r;

                            ctx.beginPath();
                            ctx.arc(x, y, 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                };
                
                drawParticles(false);
                drawParticles(true);

                ctx.beginPath();
                ctx.strokeStyle = `hsla(210, 100%, 50%, 0.3)`;
                ctx.lineWidth = 1;
                ctx.shadowBlur = 0;
                ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
                ctx.stroke();
            },
            
            circular_beat: (ctx, canvas, data, len, hue, instance) => {
                const timeData = instance.timeDataArray;
                if (!timeData) return;

                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const baseRadius = Math.min(canvas.width, canvas.height) * 0.2; 
                ctx.fillStyle = `hsl(${hue}, 100%, 75%)`;
                
                const points = Math.floor(len / 2);
                
                for (let i = 0; i <= points; i++) {
                    let v = timeData[i];
                    
                    const radian = (i / points) * Math.PI;
                    const r = ((v + baseRadius) * 0.7);

                    const drawPoint = (rad) => {
                        let x = r * Math.cos(rad) + cx;
                        let y = r * Math.sin(rad) + cy;
                        ctx.beginPath();
                        ctx.arc(x, y, 2, 0, Math.PI * 2); 
                        ctx.fill();
                    };

                    drawPoint(radian);
                    if (i > 0 && i < points) {
                        drawPoint(-radian);
                    }
                }
            },
            
            oscilloscope: (ctx, canvas, data, len, hue, instance) => {
                const timeData = instance.timeDataArray;
                if (!timeData) return;

                ctx.lineWidth = 3;
                ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                
                ctx.beginPath();

                const sliceWidth = canvas.width / len;
                let x = 0;

                for (let i = 0; i < len; i++) {
                    const v = timeData[i] / 128.0; 
                    const y = v * canvas.height / 2;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.stroke();

                ctx.globalCompositeOperation = 'destination-over';
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
                ctx.lineWidth = 1;
                ctx.moveTo(0, canvas.height / 2);
                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.stroke();
            },

            // circular_spectrum: (ctx, canvas, data, len, hue, instance) => {
            //     const cx = canvas.width / 2;
            //     const cy = canvas.height / 2;
            //     const minDim = Math.min(canvas.width, canvas.height);
            //     const radius = minDim * 0.15; 
                
            //     let bass = 0;
            //     // Reduce bass sample count slightly for speed
            //     const bassBinCount = 10;
            //     for(let i=0; i<bassBinCount; i++) bass += data[i];
            //     bass = bass / bassBinCount;
                
            //     const bassScale = 1 + (bass / 255) * 0.4;
                
            //     ctx.translate(cx, cy);
            //     const time = Date.now() / 3000;
            //     ctx.rotate(time);
                
            //     // Initialize particles with reduced count (40 instead of 60)
            //     if (!instance.particles || instance.particles.length === 0) {
            //         instance.particles = Array.from({length: 40}, () => ({
            //             x: (Math.random() - 0.5) * minDim,
            //             y: (Math.random() - 0.5) * minDim,
            //             angle: Math.random() * Math.PI * 2,
            //             speed: Math.random() * 2 + 1,
            //             size: Math.random() * 3 + 1,
            //             life: Math.random()
            //         }));
            //     }
                
            //     ctx.save();
            //     instance.particles.forEach(p => {
            //         const moveSpeed = p.speed * (1 + (bass / 255));
            //         p.x += Math.cos(p.angle) * moveSpeed;
            //         p.y += Math.sin(p.angle) * moveSpeed;
                    
            //         const dist = Math.sqrt(p.x*p.x + p.y*p.y);
                    
            //         if (dist > minDim * 0.6) {
            //             p.angle = Math.random() * Math.PI * 2;
            //             const startDist = Math.random() * radius; 
            //             p.x = Math.cos(p.angle) * startDist;
            //             p.y = Math.sin(p.angle) * startDist;
            //         }
                    
            //         ctx.beginPath();
            //         const pAlpha = 1 - (dist / (minDim * 0.6));
            //         ctx.fillStyle = `hsla(${hue + 40}, 100%, 70%, ${pAlpha})`;
            //         ctx.arc(p.x, p.y, p.size * bassScale, 0, Math.PI * 2);
            //         ctx.fill();
            //     });
            //     ctx.restore();

            //     ctx.globalCompositeOperation = 'lighter';
                
            //     // Center circle setup
            //     ctx.beginPath();
            //     ctx.arc(0, 0, radius * bassScale, 0, Math.PI * 2);
            //     ctx.lineWidth = 4;
            //     ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
            //     ctx.shadowBlur = 20; // Reduced initial shadow
            //     ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
            //     ctx.stroke();
                
            //     ctx.beginPath();
            //     ctx.arc(0, 0, radius * bassScale * 0.9, 0, Math.PI * 2);
            //     ctx.fillStyle = `rgba(0, 0, 0, 0.8)`;
            //     ctx.fill();
            //     ctx.lineWidth = 2;
            //     ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.5)`;
            //     ctx.stroke();

            //     // Bar Optimization: 
            //     // 1. Reduced bar count (90 vs 120)
            //     // 2. Set shadow ONCE outside the loop (major performance gain)
            //     const bars = 90; 
            //     const angleStep = (Math.PI * 2) / bars;
            //     const radiusOffset = radius * bassScale + 5; 
            //     const maxBarHeight = minDim * 0.25;
                
            //     // Set shadow once for all bars
            //     ctx.shadowBlur = 10;
            //     ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                
            //     for (let i = 0; i < bars; i++) {
            //         let dataIdx;
            //         if (i < bars / 2) {
            //             dataIdx = Math.floor((i / (bars/2)) * (len * 0.5));
            //         } else {
            //             dataIdx = Math.floor(((bars - i) / (bars/2)) * (len * 0.5));
            //         }
                    
            //         const val = data[dataIdx] || 0;
            //         const valNext = data[dataIdx + 1] || 0;
            //         const smoothVal = (val + valNext) / 2;
                    
            //         if (smoothVal > 10) { // Increased threshold to skip tiny bars
            //             const barHeight = (smoothVal / 255) * maxBarHeight * bassScale;
                        
            //             ctx.save();
            //             ctx.rotate(i * angleStep);
            //             ctx.translate(0, radiusOffset);
                        
            //             // We still change fillStyle because color gradient is important for the look
            //             ctx.fillStyle = `hsl(${hue + (smoothVal/255)*60}, 100%, 60%)`;
                        
            //             const w = (2 * Math.PI * radiusOffset) / bars * 0.6; 
                        
            //             ctx.beginPath();
            //             ctx.roundRect(-w/2, 0, w, barHeight, 4); // Fixed radius
            //             ctx.fill();
                        
            //             ctx.restore();
            //         }
            //     }
            // },

            neon_wave: (ctx, canvas, data, len, hue) => {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                
                ctx.globalCompositeOperation = 'lighter'; 
                
                const numPoints = 64; 
                const width = canvas.width * 0.9;
                const startX = (canvas.width - width) / 2;
                const sliceWidth = width / (numPoints - 1);
                
                const primaryColor = `hsla(${hue}, 100%, 60%, 0.8)`;
                const secondaryColor = `hsla(${hue + 40}, 100%, 50%, 0.5)`;
                const glowColor = `hsla(${hue + 20}, 100%, 70%, 0.6)`;
                
                ctx.shadowBlur = 20;
                ctx.shadowColor = primaryColor;
                
                const points = [];
                // Unused but kept for structure if needed
                const dataStep = Math.floor((len * 0.6) / (numPoints / 2)); 

                for(let i = 0; i < numPoints; i++) {
                    const distanceFromCenter = Math.abs(i - (numPoints - 1) / 2) / ((numPoints - 1) / 2);
                    const inverseDist = 1 - distanceFromCenter;
                    const dataIdx = Math.floor(inverseDist * (len * 0.4)); 
                    
                    let val = 0;
                    const range = 2;
                    let count = 0;
                    for(let j = -range; j <= range; j++) {
                        if (data[dataIdx + j] !== undefined) {
                            val += data[dataIdx + j];
                            count++;
                        }
                    }
                    val = count ? val / count : 0;

                    const envelope = Math.pow(Math.sin((i / (numPoints - 1)) * Math.PI), 1.5);
                    const amp = (val / 255.0) * (canvas.height * 0.35) * envelope;
                    
                    points.push({
                        x: startX + i * sliceWidth,
                        yTop: cy - amp,
                        yBottom: cy + amp,
                        amp: amp
                    });
                }

                ctx.lineWidth = 1;
                ctx.strokeStyle = secondaryColor;
                ctx.beginPath();
                for(let i=0; i<points.length; i++) {
                    const p = points[i];
                    if (p.amp > 2) {
                        ctx.moveTo(p.x, p.yTop);
                        ctx.lineTo(p.x, p.yBottom);
                    }
                }
                ctx.stroke();

                const layers = 5; 
                for (let j = 0; j <= layers; j++) {
                    const t = j / layers; 
                    ctx.beginPath();
                    
                    if (j === 0 || j === layers) {
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = primaryColor;
                    } else {
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = glowColor;
                    }

                    for (let i = 0; i < points.length; i++) {
                        const p = points[i];
                        const y = p.yTop + (p.yBottom - p.yTop) * t;
                        
                        if (i === 0) ctx.moveTo(p.x, y);
                        else {
                            const prevP = points[i-1];
                            const prevY = prevP.yTop + (prevP.yBottom - prevP.yTop) * t;
                            const cpX = (prevP.x + p.x) / 2;
                            const cpY = (prevY + y) / 2;
                            ctx.quadraticCurveTo(prevP.x, prevY, cpX, cpY);
                        }
                    }
                    ctx.stroke();
                }

                ctx.beginPath();
                ctx.lineWidth = 3;
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.shadowBlur = 30;
                ctx.shadowColor = "white";
                
                for (let i = 0; i < points.length; i++) {
                    const p = points[i];
                    const y = (p.yTop + p.yBottom) / 2; 
                    if (i === 0) ctx.moveTo(p.x, y);
                    else ctx.lineTo(p.x, y);
                }
                ctx.stroke();
            },

            digital_spectrum: (ctx, canvas, data, len, hue, instance) => {
                const timeData = instance.timeDataArray;
                if (!timeData) return;

                const cy = canvas.height / 2;
                const cw = canvas.width;
                
                const themeColor = 'hsla(190, 100%, 50%, 1)'; // Cyan
                const glowColor = 'hsla(190, 100%, 50%, 0.8)';
                
                ctx.shadowBlur = 15;
                ctx.shadowColor = glowColor;

                // 1. Bottom: Frequency Curtain (Thicker bars)
                const barWidth = 6; 
                const gap = 2;
                const numBars = Math.floor(cw / (barWidth + gap));
                const freqStep = Math.floor((len * 0.75) / numBars);

                for (let i = 0; i < numBars; i++) {
                    let val = 0;
                    for(let j=0; j<freqStep; j++) {
                        val += data[(i * freqStep) + j] || 0;
                    }
                    val /= freqStep;

                    const percent = val / 255;
                    const height = Math.pow(percent, 1.5) * (canvas.height * 0.45);

                    if (height > 2) {
                        const grad = ctx.createLinearGradient(0, cy, 0, cy + height);
                        grad.addColorStop(0, themeColor);
                        grad.addColorStop(1, 'hsla(220, 100%, 30%, 0)'); 

                        ctx.fillStyle = grad;
                        ctx.fillRect(i * (barWidth + gap), cy, barWidth, height);
                    }
                }

                // 2. Top: 2 Waves oscillating
                const drawWave = (offset, color, lineWidth, ampMultiplier) => {
                    ctx.lineWidth = lineWidth;
                    ctx.strokeStyle = color;
                    ctx.shadowBlur = 20;
                    
                    ctx.beginPath();
                    const sliceW = cw / len;
                    let x = 0;
                    
                    for(let i = 0; i < len; i++) {
                        // Phase shift for secondary wave
                        const index = (i + offset) % len;
                        const v = timeData[index];
                        const normalized = (v - 128) / 128.0; 
                        const amp = normalized * (canvas.height * 0.35) * ampMultiplier;
                        const yPos = cy - amp; // Go Up

                        if(i===0) ctx.moveTo(x, yPos);
                        else ctx.lineTo(x, yPos);
                        x += sliceW;
                    }
                    ctx.stroke();
                };

                // Secondary Wave (Offset phase, slightly transparent)
                drawWave(50, 'hsla(180, 100%, 70%, 0.5)', 2, 0.9);

                // Main Wave (Bright, sharp)
                drawWave(0, '#ffffff', 3, 1.0);

                // 3. Center Axis (Baseline)
                ctx.beginPath();
                ctx.moveTo(0, cy);
                ctx.lineTo(cw, cy);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.shadowBlur = 0; 
                ctx.stroke();
            }
        };
    }
}

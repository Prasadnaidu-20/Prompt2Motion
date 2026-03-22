import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function AnimatedBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        function resize() {
            renderer.setSize(window.innerWidth, window.innerHeight, false);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        }
        resize();
        window.addEventListener('resize', resize);

        // --- Just particles, very subtle
        const N = 120;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(N * 3);
        const speeds = [];

        for (let i = 0; i < N; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 16;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
            speeds.push(0.002 + Math.random() * 0.003);
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xd4af37,
            size: 0.04,
            transparent: true,
            opacity: 0.35,
            sizeAttenuation: true,
        });
        scene.add(new THREE.Points(geo, mat));

        // --- One slow rotating ring
        const ringGeo = new THREE.TorusGeometry(3, 0.006, 6, 120);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xd4af37, transparent: true, opacity: 0.08
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 5;
        scene.add(ring);

        // --- Animate
        let frame;
        const clock = new THREE.Clock();

        function animate() {
            frame = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();

            // drift particles upward slowly
            const positions = geo.attributes.position.array;
            for (let i = 0; i < N; i++) {
                positions[i * 3 + 1] += speeds[i];
                if (positions[i * 3 + 1] > 8) positions[i * 3 + 1] = -8;
            }
            geo.attributes.position.needsUpdate = true;

            // very slow ring rotation
            ring.rotation.y = t * 0.08;
            ring.rotation.z = t * 0.04;

            // subtle camera sway
            camera.position.x = Math.sin(t * 0.05) * 0.2;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        }
        animate();

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
            renderer.dispose();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0, left: 0,
                width: '100%', height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
                opacity: 0.6,
            }}
        />
    );
}
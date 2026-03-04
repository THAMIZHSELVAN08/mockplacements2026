import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import { GalleryVerticalEnd } from 'lucide-react';
import { LoginForm } from '../components/login-form';
import Grainient from '../components/Grainient';

const LoginPage = () => {
    const setAuth = useAuthStore((state) => state.setAuth);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const username = (form.elements.namedItem('username') as HTMLInputElement)?.value
            || (form.elements.namedItem('email') as HTMLInputElement)?.value;
        const password = (form.elements.namedItem('password') as HTMLInputElement)?.value;

        try {
            const response = await api.post('/auth/login', { username, password });
            setAuth(response.data.user, response.data.token);

            const role = response.data.user.role;
            if (role === 'ADMIN') navigate('/admin');
            else if (role === 'HR') navigate('/hr');
            else if (role === 'VOLUNTEER') navigate('/volunteer');
            else navigate('/student');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
        }
    };

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            {/* ── Left column: form ── */}
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <a href="#" className="flex items-center gap-2 font-medium">
                        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <GalleryVerticalEnd className="size-4" />
                        </div>
                        Mock Placements 2026
                    </a>
                </div>

                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <LoginForm onSubmit={handleSubmit} />
                    </div>
                </div>
            </div>

            {/* ── Right column: Grainient background ── */}
            <div className="relative hidden lg:block">
                <Grainient
                    color1="#f297ef"
                    color2="#3584e4"
                    color3="#a896e3"
                    timeSpeed={0.5}
                    colorBalance={0}
                    warpStrength={1}
                    warpFrequency={5}
                    warpSpeed={2}
                    warpAmplitude={50}
                    blendAngle={0}
                    blendSoftness={0.05}
                    rotationAmount={500}
                    noiseScale={0.6}
                    grainAmount={0}
                    grainScale={0.02}
                    grainAnimated={false}
                    contrast={1.5}
                    gamma={1}
                    saturation={1}
                    centerX={0}
                    centerY={0}
                    zoom={0.9}
                />
            </div>
        </div>
    );
};

export default LoginPage;

import { RouterProvider } from 'react-router-dom';
import logo from "../src/assets/logo/baseLogo.png";
import { router } from './routes/router.tsx';
import { CharacterProvider } from './context/CharacterContext';
import { Toaster } from 'sonner';

function App() {
    return (
        <CharacterProvider>
            <Toaster
                position="bottom-right"
                richColors
                toastOptions={{
                    style: { background: '#1f2937', border: '1px solid #374151', color: '#fff' },
                }}
            />
            <div className="relative w-screen h-screen bg-[#242424] text-white overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                    <img src={logo} alt="logo" className="opacity-10" />
                </div>
                <div className="relative z-10 w-full h-full">
                    <RouterProvider router={router} />
                </div>
            </div>
        </CharacterProvider>
    );
}

export default App;
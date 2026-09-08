import logo from "../assets/logo/logoNIPRNet.png";
import config from "../utils/config";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import { faDiscord } from "@fortawesome/free-brands-svg-icons";

export const Login = () => {

    const handleDiscordLogin = () => {
        window.location.href = `${config.URL}/auth/discord`;
    };


    return (
        <div className="flex flex-col w-full min-h-screen items-center justify-center">
            <div className="flex flex-col items-center bg-gray-900 p-6 rounded-lg shadow-lg w-[520px] h-[380px]">
                <img src={logo} alt="logo" className="mb-4"/>
                <h2 className="text-2xl font-semibold mb-4 text-white">Zaloguj się</h2>
                <button
                    onClick={handleDiscordLogin}
                    className="bg-gradient-to-r from-blue-500 via-sky-500 to-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:scale-105 transition-transform"
                >
                    <FontAwesomeIcon icon={faDiscord} className="mr-2 text-xl" />
                    Zaloguj się przez Discord
                </button>
            </div>
        </div>
    );
}
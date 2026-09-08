const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
    throw new Error(
        'VITE_API_URL nie jest zdefiniowane. Ustaw je w pliku .env / .env.production / .env.staging przed budowaniem aplikacji.'
    );
}

const appEnv = import.meta.env.VITE_APP_ENV ?? 'development';

const config = {
    URL: apiUrl,
    APP_ENV: appEnv,
    IS_STAGING: appEnv === 'staging',
};

export default config;




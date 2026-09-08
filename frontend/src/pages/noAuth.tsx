import noauth from "../assets/gif/noauth.gif"

export const NoAuth = () => {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <img src={noauth} alt="No Authorization" className="w-256 h-auto" />
        </div>
    );
}
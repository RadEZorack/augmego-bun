function Login() {
    const login = () => {
        window.location.href = "http://localhost:3003/auth/discord";
    };

    return <button onClick={login}>Login with Discord</button>;
}

export default Login;

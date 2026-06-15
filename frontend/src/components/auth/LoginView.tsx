import PuppetStage from "./PuppetStage";
import { SignIn } from "@clerk/clerk-react";


export const LoginView = () => {
    return (
        <div className="flex h-screen w-full bg-white">
            {/* Left Side - Puppets (50%) - Black Background */}
            <PuppetStage />

            {/* Right Side - Login Form (50%) */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-white p-4 relative z-10">

                        {/* Clerk SignIn */}
                        <div className="flex justify-center w-full max-w-[400px]">
                            <SignIn
                                routing="path"
                                path="/login"
                                signUpUrl="/register"
                                appearance={{
                                    elements: {
                                        rootBox: "w-full",
                                        headerTitle: "text-[#212126]",
                                        headerSubtitle: "text-[#5E606E]",
                                    },
                                    variables: {
                                        colorPrimary: "#22c55e",
                                        colorBackground: "#ffffff",
                                        colorText: "#212126",
                                        colorInputBackground: "#ffffff",
                                        colorInputText: "#212126",
                                        borderRadius: "0.75rem",
                                    },
                                }}
                            />
                        </div>
            </div>
        </div>
    );
};

import { House, Network, User2 } from "lucide-react";
import Link from "next/link";

export default function NavBar() {
    return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 p-4">
            <div className="flex justify-between items-center rounded-full bg-white/80 backdrop-blur-xs w-[300px] px-4 py-3">
                <Link href="/dashboard" className="flex justify-center items-center h-10 w-10 bg-black rounded-full">
                    <Network className="size-6 text-white" />
                </Link>
                <Link href="/" className="flex justify-center items-center h-10 w-10 bg-black rounded-full">
                    <House className="size-6 text-white" />
                </Link>
                <Link href="/profile" className="flex justify-center items-center h-10 w-10 bg-black rounded-full">
                    <User2 className="size-6 text-white" />
                </Link>
            </div>
        </div>
    )
}
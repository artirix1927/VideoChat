

export const Navbar = () => {
    return <>
        <div className="navbar flex items-center justify-between py-4 px-20 font-mono">
            <div><h6 className="text-xl font-bold">GAME\W.ME</h6></div>

            <div className="flex gap-4">
                <label>Why Us?</label>
                <label>Product</label>
                <label>Solutions</label>
                <label>Resources</label>
                <label>Reviews</label>
            </div>


            <div className="flex gap-6">
                <button className="py-1 px-3 rounded-sm text-lg border border-white">SIGN IN</button>
                <button className="py-1 px-3 rounded-sm text-lg border border-white bg-purple-700">SIGN UP</button>
            </div>
        </div>
    </>
}
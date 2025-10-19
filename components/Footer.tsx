import pkg from "../package.json";
export default function Footer() {
  return (
    <footer className="w-full border-t mt-6 p-4 flex items-center justify-between text-sm text-gray-500">
      <div>© 2025 k53 Dating</div>
      <div>v{pkg.version}</div>
    </footer>
  );
}

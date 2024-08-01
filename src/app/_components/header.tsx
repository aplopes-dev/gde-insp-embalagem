import Image from "next/image";
import { ThemeModeToggle } from "./theme-mode-toggle";

const Header = () => {
  return (
    <header className="w-full h-12 xl:h-16 exl:h-24 p-2 xl:p-6 flex justify-between items-center">
      <div className="w-24 xl:w-28 exl:w-40 h-12 xl:h-14 exl:h-20 relative">
        <Image layout="fill" src={`/images/logo.png`} alt="GDE" />
      </div>
      <div>
        <ThemeModeToggle />
      </div>
    </header>
  );
};

export default Header;

import Header from "../_components/header";
import { DailyOpList } from "./_components/daily-op-list";
import OpLoadForm from "./_components/op-load-form";

export default function Home() {
  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="container flex flex-col gap-6 lg:gap-16">
        <h1 className="text-xl xl:text-4xl exl:text-8xl uppercase font-bold text-center">
          Digite o código da OP
        </h1>
        <OpLoadForm />
      </div>
      <DailyOpList />
    </div>
  );
}

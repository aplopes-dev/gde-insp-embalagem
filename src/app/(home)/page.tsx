import OpLoadForm from "./_components/op-load-form";

export default function Home() {
  return (
    <div className="container flex flex-col">
      <div className="mt-4 xl:mt-16 exl:mt-24">
        <h1 className="text-xl xl:text-4xl exl:text-8xl uppercase font-bold text-center">
          Digite o código da OP
        </h1>
      </div>
      <div className="flex justify-stretch mt-4 xl:mt-16 exl:mt-24">
        <OpLoadForm />
      </div>
    </div>
  );
}

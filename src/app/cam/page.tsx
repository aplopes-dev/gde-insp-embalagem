import CamForm from "./_components/form";

const Cam = () => {
  return (
    <div className="container mt-16">
      <h1 className="text-2xl">Configuração do simulador de validação</h1>
      <div className="mt-8 lg:w-1/2">
        <CamForm />
      </div>
    </div>
  );
};

export default Cam;

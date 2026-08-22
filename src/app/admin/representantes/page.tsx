export default function RepresentantesAdminPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Representantes (RPA)</h1>
        <p className="text-muted-foreground">
          Adicione, edite ou remova representantes manualmente.
        </p>
      </div>
      <div className="border rounded-xl p-6 bg-card text-card-foreground shadow-sm flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Módulo em construção (CRUD Manual de Representantes)</p>
      </div>
    </div>
  );
}

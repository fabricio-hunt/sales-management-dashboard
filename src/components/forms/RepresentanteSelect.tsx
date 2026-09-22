// Select de representante agrupado por equipe (<optgroup>) — extraído depois do
// import das 5 equipes restantes (22/09/2026): a lista plana de 41
// representantes ficou grande demais pra escanear numa única lista. Sem
// equipe (representante ainda não vinculado) cai num grupo "Sem equipe" no
// fim. Ver docs/plano-implementacao-equipes.md (Fase 3).

type Representante = { id: string; nome: string; equipe_id: string | null };

interface RepresentanteSelectProps {
  id?: string;
  representantes: Representante[];
  value: string;
  onChange: (id: string) => void;
  emptyLabel?: string;
  className?: string;
}

export function RepresentanteSelect({ id, representantes, value, onChange, emptyLabel, className }: RepresentanteSelectProps) {
  const porEquipe = new Map<string, Representante[]>();
  const semEquipe: Representante[] = [];
  for (const r of representantes) {
    if (r.equipe_id) {
      const lista = porEquipe.get(r.equipe_id) ?? [];
      lista.push(r);
      porEquipe.set(r.equipe_id, lista);
    } else {
      semEquipe.push(r);
    }
  }
  const equipesOrdenadas = [...porEquipe.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? "h-9 w-64 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"}
    >
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {equipesOrdenadas.map((equipeId) => (
        <optgroup key={equipeId} label={`Equipe ${equipeId}`}>
          {porEquipe.get(equipeId)!.map((r) => (
            <option key={r.id} value={r.id}>{r.id} — {r.nome}</option>
          ))}
        </optgroup>
      ))}
      {semEquipe.length > 0 && (
        <optgroup label="Sem equipe">
          {semEquipe.map((r) => (
            <option key={r.id} value={r.id}>{r.id} — {r.nome}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

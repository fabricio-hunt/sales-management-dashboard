import os
import sys
import pandas as pd
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables (from .env.local usually in Next.js)
load_dotenv('.env.local')

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print(json.dumps({"success": False, "error": "Supabase credentials missing."}))
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Expected columns for the Guardrails validation
EXPECTED_COLUMNS = [
    "Seq", "Data Documento", "Fornecedor", "Cond. Pagto", "Município", "UF",
    "Cliente", "Representante", "Nr Pedido", "Produto", "Região", "Área",
    "Setor", "Entidade", "Transação", "Supervisor", "Linha", "Data", "Ramo",
    "Embalagem", "Kit", "Código Produto", "Fantasia Cliente", "Fantasia Fornec",
    "Cod.Pessoa", "CodReferencia", "DescrReferencia", "CodMotivo", "Descr.Motivo",
    "TipoTabela", "Tipo Doc", "Codigo Kit", "Descrição Kit", "Grupo", "CPF\CNPJ",
    "Nota Fiscal", "Devolução", "Desconto", "Compra", "Venda", "Qtde Saída",
    "Peso Bruto", "Peso Liq.", "Qtde Dev.", "Desconto Promocional",
    "Qtde Itens Ped", "Desp. Acessória", "VDA LIQ", "TT VDA LIQ", "POSIT"
]

def process_file(file_path):
    try:
        # Read the Excel file (we assume the user uploads the DD PEDIDOS tab or the template)
        df = pd.read_excel(file_path)
        
        # 1. Guardrails: Check Columns
        missing_cols = [col for col in EXPECTED_COLUMNS if col not in df.columns]
        if missing_cols:
            return {"success": False, "error": f"Colunas faltando no arquivo: {', '.join(missing_cols)}"}
        
        # 2. Data Cleaning
        df = df.fillna("")
        
        # We will extract unique Representantes, Clientes, Produtos and Upsert them
        # Extract Representantes
        reps_df = df[['Representante', 'Supervisor']].drop_duplicates().copy()
        reps_df['id'] = reps_df['Representante'].apply(lambda x: str(x).split(' ')[0] if pd.notna(x) and x != "" else "0")
        
        reps_data = []
        for _, row in reps_df.iterrows():
            if row['id'] != "0":
                reps_data.append({
                    "id": row['id'],
                    "nome": str(row['Representante']),
                    "supervisor": str(row['Supervisor'])
                })
                
        # Extract Clientes
        clientes_df = df[['Cod.Pessoa', 'Cliente', 'Fantasia Cliente', 'CPF\CNPJ', 'Município', 'UF']].drop_duplicates(subset=['Cod.Pessoa']).copy()
        clientes_data = []
        for _, row in clientes_df.iterrows():
            if str(row['Cod.Pessoa']) != "":
                clientes_data.append({
                    "id": str(row['Cod.Pessoa']),
                    "razao_social": str(row['Cliente']),
                    "fantasia": str(row['Fantasia Cliente']),
                    "cnpj": str(row['CPF\CNPJ']),
                    "municipio": str(row['Município']),
                    "uf": str(row['UF'])
                })
        
        # Extract Produtos
        produtos_df = df[['Código Produto', 'Produto', 'Fornecedor']].drop_duplicates(subset=['Código Produto']).copy()
        produtos_data = []
        for _, row in produtos_df.iterrows():
            if str(row['Código Produto']) != "":
                produtos_data.append({
                    "id": str(row['Código Produto']),
                    "descricao": str(row['Produto']),
                    "fornecedor_nome": str(row['Fornecedor'])
                })
        
        # Insert Dimensions (Upsert to avoid conflicts)
        if reps_data:
            supabase.table('representantes').upsert(reps_data).execute()
        if clientes_data:
            supabase.table('clientes').upsert(clientes_data).execute()
        if produtos_data:
            supabase.table('produtos').upsert(produtos_data).execute()
            
        # 3. Process Vendas (Fato)
        # Convert Date
        df['Data Documento'] = pd.to_datetime(df['Data Documento'], errors='coerce')
        df = df.dropna(subset=['Data Documento']) # Drop rows with invalid dates
        
        # We'll batch insert Vendas
        batch_size = 500
        vendas_data = []
        
        for index, row in df.iterrows():
            rep_id = str(row['Representante']).split(' ')[0] if pd.notna(row['Representante']) and row['Representante'] != "" else None
            cliente_id = str(row['Cod.Pessoa']) if pd.notna(row['Cod.Pessoa']) and row['Cod.Pessoa'] != "" else None
            produto_id = str(row['Código Produto']) if pd.notna(row['Código Produto']) and row['Código Produto'] != "" else None
            
            # Convert string numbers to float safely
            def to_float(val):
                try:
                    return float(val) if val != "" else 0.0
                except:
                    return 0.0

            if cliente_id and produto_id and rep_id:
                vendas_data.append({
                    "pedido_nr": str(row['Nr Pedido']),
                    "data_venda": row['Data Documento'].strftime('%Y-%m-%d'),
                    "cliente_id": cliente_id,
                    "representante_id": rep_id,
                    "produto_id": produto_id,
                    "venda_liq": to_float(row['VDA LIQ']),
                    "devolucao": to_float(row['Devolução']),
                    "desconto": to_float(row['Desconto']),
                    "venda_bruta": to_float(row['Venda']),
                    "qtde": to_float(row['Qtde Saída']),
                    "peso_bruto": to_float(row['Peso Bruto']),
                    "peso_liq": to_float(row['Peso Liq.']),
                    "is_positivacao": 1 if str(row['POSIT']) == "1" else 0
                })
                
        # Insert Vendas in batches
        inserted_count = 0
        for i in range(0, len(vendas_data), batch_size):
            batch = vendas_data[i:i + batch_size]
            supabase.table('vendas').insert(batch).execute()
            inserted_count += len(batch)

        return {"success": True, "message": f"Processamento concluído. {inserted_count} vendas importadas com sucesso!"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Caminho do arquivo não fornecido."}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(json.dumps({"success": False, "error": f"Arquivo não encontrado: {file_path}"}))
        sys.exit(1)
        
    result = process_file(file_path)
    print(json.dumps(result))

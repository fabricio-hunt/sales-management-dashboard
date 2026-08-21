-- Script de Criação das Tabelas (Rode isso no SQL Editor do Supabase)

-- 1. Tabela Principal de Pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_documento TIMESTAMP WITH TIME ZONE,
  nota_fiscal TEXT,
  cliente_nome TEXT,
  cliente_cnpj TEXT,
  municipio TEXT,
  uf TEXT,
  representante TEXT,
  produto_nome TEXT,
  fornecedor_nome TEXT,
  valor_venda_liquida NUMERIC(10,2),
  valor_compra NUMERIC(10,2),
  qtde NUMERIC(10,2),
  desconto NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Evolução de Clientes (Positivação)
CREATE TABLE IF NOT EXISTS public.evolucao_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_cnpj TEXT,
  representante TEXT,
  status_ativo BOOLEAN,
  data_ultima_compra TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (Segurança) mas deixaremos aberto para o Admin por enquanto
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucao_clientes ENABLE ROW LEVEL SECURITY;

-- Política para permitir Inserções e Leituras públicas temporárias (só para testes, pode remover depois)
CREATE POLICY "Permitir leitura anonima" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "Permitir insercao anonima" ON public.pedidos FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura anonima evo" ON public.evolucao_clientes FOR SELECT USING (true);
CREATE POLICY "Permitir insercao anonima evo" ON public.evolucao_clientes FOR INSERT WITH CHECK (true);

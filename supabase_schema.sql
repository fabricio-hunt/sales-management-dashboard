-- Script de Criação das Tabelas Normalizadas (Rode isso no SQL Editor do Supabase)

-- Limpeza de tabelas antigas se existirem
DROP TABLE IF EXISTS public.vendas CASCADE;
DROP TABLE IF EXISTS public.produtos CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.representantes CASCADE;
DROP TABLE IF EXISTS public.pedidos CASCADE;
DROP TABLE IF EXISTS public.evolucao_clientes CASCADE;

-- 1. Tabela de Representantes
CREATE TABLE public.representantes (
  id TEXT PRIMARY KEY, -- Ex: "308"
  nome TEXT NOT NULL,  -- Ex: "REPRESENTANTE 308"
  supervisor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Clientes
CREATE TABLE public.clientes (
  id TEXT PRIMARY KEY, -- Cod.Pessoa
  razao_social TEXT,
  fantasia TEXT,
  cnpj TEXT,
  municipio TEXT,
  uf TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Produtos
CREATE TABLE public.produtos (
  id TEXT PRIMARY KEY, -- Código Produto
  descricao TEXT,
  fornecedor_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela Fato de Vendas
CREATE TABLE public.vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_nr TEXT,
  data_venda DATE NOT NULL,
  cliente_id TEXT REFERENCES public.clientes(id),
  representante_id TEXT REFERENCES public.representantes(id),
  produto_id TEXT REFERENCES public.produtos(id),
  venda_liq NUMERIC(15,2),
  devolucao NUMERIC(15,2),
  desconto NUMERIC(15,2),
  venda_bruta NUMERIC(15,2),
  qtde NUMERIC(15,4),
  peso_bruto NUMERIC(15,4),
  peso_liq NUMERIC(15,4),
  is_positivacao INTEGER DEFAULT 1, -- Equivalente à coluna "PEDIDOS" do export DD PEDIDOS (nome real, apesar de sugerir outra coisa)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (Segurança) mas deixaremos aberto para o Admin por enquanto
ALTER TABLE public.representantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir Leituras e Inserções públicas temporárias (só para testes, remover depois)
CREATE POLICY "Permitir full access reps" ON public.representantes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir full access clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir full access prod" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir full access vendas" ON public.vendas FOR ALL USING (true) WITH CHECK (true);

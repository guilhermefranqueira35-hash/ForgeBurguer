import os
import sqlite3
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ItemCarrinho(BaseModel):
    name: str
    price: float
    quantity: int

class Pedido(BaseModel):
    nome_cliente: str  
    itens: List[ItemCarrinho]
    observacao: Optional[str] = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if os.name != 'nt':  # Se NÃO for Windows (ou seja, se for o Render)
    PATH_BANCO = '/tmp/forgeburger.db'
else:
    PATH_BANCO = os.path.join(BASE_DIR, 'forgeburger.db')

def inicializar_banco():
    conn = sqlite3.connect(PATH_BANCO)
    cursor = conn.cursor()
    
    # 🌟 CORREÇÃO 1: Adicionado 'id INTEGER PRIMARY KEY AUTOINCREMENT' de forma explícita
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_cliente TEXT,
            itens TEXT,
            observacao TEXT,
            status TEXT DEFAULT 'pendente',
            data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

inicializar_banco()


@app.post("/enviar-pedido")
def enviar_pedido(pedido: Pedido):
    conn = sqlite3.connect(PATH_BANCO)
    cursor = conn.cursor()
    
    # .dict() foi atualizado para .model_dump() se usar Pydantic v2, mas mantido funcional
    itens_em_texto = json.dumps([item.dict() for item in pedido.itens])
    
    cursor.execute(
        "INSERT INTO pedidos (nome_cliente, itens, observacao) VALUES (?, ?, ?)",
        (pedido.nome_cliente, itens_em_texto, pedido.observacao)
    )
    
    id_do_pedido = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "status": "sucesso", 
        "mensagem": f"Pedido de {pedido.nome_cliente} enviado para a chapa!",
        "pedido_id": id_do_pedido
    }

@app.get("/pedidos")
def listar_pedidos():
    try:
        conn = sqlite3.connect(PATH_BANCO)
        conn.row_factory = sqlite3.Row 
        cursor = conn.cursor()
        
        # Busca ordenando pelo ID do mais novo para o mais antigo
       # 🌟 Alterado para trazer APENAS os pedidos pendentes
        cursor.execute("SELECT * FROM pedidos WHERE status = 'pendente' ORDER BY id DESC")
        linhas = cursor.fetchall()
        
        pedidos_finais = []
        for linha in linhas:
            colunas = list(linha.keys())
            
            # 🌟 CORREÇÃO 2: Agora puxa o ID real vindo do banco de dados
            pedidos_finais.append({
                "id": linha["id"] if "id" in colunas else None,
                "nome_cliente": linha["nome_cliente"] if "nome_cliente" in colunas else "Cliente Anônimo",
                "itens": json.loads(linha["itens"]) if "itens" in colunas else [],
                "observacao": linha["observacao"] if "observacao" in colunas else None,
                "status": linha["status"] if "status" in colunas else "pendente",
                "data": linha["data"] if "data" in colunas else "Sem data"
            })
            
        conn.close()
        return pedidos_finais
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno no servidor: {str(e)}")

# 🌟 CORREÇÃO 3: Criada a rota de cancelamento que o JavaScript estava chamando!
@app.post("/cancelar-pedido/{pedido_id}")
def cancelar_pedido(pedido_id: int):
    conn = sqlite3.connect(PATH_BANCO)
    cursor = conn.cursor()
    
    # Verifica primeiro se o pedido existe
    cursor.execute("SELECT id FROM pedidos WHERE id = ?", (pedido_id,))
    pedido = cursor.fetchone()
    
    if not pedido:
        conn.close()
        raise HTTPException(status_code=404, detail="Pedido não encontrado no sistema.")
        
    # Remove o pedido ou altera o status (deletar é mais direto para zerar a chapa)
    cursor.execute("DELETE FROM pedidos WHERE id = ?", (pedido_id,))
    conn.commit()
    conn.close()
    
    return {
        "status": "sucesso",
        "mensagem": f"Pedido #{pedido_id} foi cancelado e removido da chapa!"
    }

@app.post("/atualizar-status/{pedido_id}")
def atualizar_status(pedido_id: int):
    conn = sqlite3.connect(PATH_BANCO)
    cursor = conn.cursor()
    
    # Atualiza o status
    cursor.execute("UPDATE pedidos SET status = 'entregue' WHERE id = ?", (pedido_id,))
    
    conn.commit()
    conn.close()
    return {"status": "sucesso", "mensagem": "Pedido finalizado!"}

@app.get("/status-pedido/{pedido_id}")
def verificar_status_pedido(pedido_id: int):
    conn = sqlite3.connect(PATH_BANCO)
    cursor = conn.cursor()
    
    cursor.execute("SELECT status FROM pedidos WHERE id = ?", (pedido_id,))
    resultado = cursor.fetchone()
    
    conn.close()
    
    if resultado:
        return {"status": resultado[0]} # Retorna 'pendente' ou 'entregue'
    else:
        return {"status": "inexistente"}

if __name__ == "__main__":
    import uvicorn
    # Certifique-se de que o nome do seu arquivo seja exatamente igual ao indicado aqui (ex: servidor.py)
    uvicorn.run("servidor:app", host="127.0.0.1", port=8000, reload=True)



import ast
import sympy as sp


TEMPO = sp.Symbol("t", real=True)

FUNCOES = {
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "sqrt": sp.sqrt,
    "exp": sp.exp,
    "log": sp.log,
    "abs": sp.Abs,
    "Abs": sp.Abs,
}

CONSTANTES = {
    "pi": sp.pi,
    "E": sp.E,
}


class ErroExpressao(ValueError):
    """Expressão matemática inválida ou não permitida."""


def _converter(no):
    """Converte somente operações explicitamente permitidas."""

    if isinstance(no, ast.Constant):
        if isinstance(no.value, bool) or not isinstance(no.value, (int, float)):
            raise ErroExpressao("Use apenas números reais.")

        return sp.Rational(str(no.value))

    if isinstance(no, ast.Name):
        if no.id == "t":
            return TEMPO

        if no.id in CONSTANTES:
            return CONSTANTES[no.id]

        raise ErroExpressao(f"Símbolo não permitido: {no.id}")

    if isinstance(no, ast.UnaryOp):
        valor = _converter(no.operand)

        if isinstance(no.op, ast.UAdd):
            return valor

        if isinstance(no.op, ast.USub):
            return -valor

        raise ErroExpressao("Operador unário não permitido.")

    if isinstance(no, ast.BinOp):
        esquerda = _converter(no.left)
        direita = _converter(no.right)

        operacoes = {
            ast.Add: lambda a, b: a + b,
            ast.Sub: lambda a, b: a - b,
            ast.Mult: lambda a, b: a * b,
            ast.Div: lambda a, b: a / b,
            ast.Pow: lambda a, b: a ** b,
        }

        for tipo, operacao in operacoes.items():
            if isinstance(no.op, tipo):
                return operacao(esquerda, direita)

        raise ErroExpressao("Operador matemático não permitido.")

    if isinstance(no, ast.Call):
        if not isinstance(no.func, ast.Name):
            raise ErroExpressao("Chamada de função inválida.")

        nome = no.func.id

        if nome not in FUNCOES:
            raise ErroExpressao(f"Função não permitida: {nome}")

        if no.keywords or len(no.args) != 1:
            raise ErroExpressao(
                f"A função {nome} deve receber exatamente um argumento."
            )

        argumento = _converter(no.args[0])
        return FUNCOES[nome](argumento)

    raise ErroExpressao(
        f"Construção não permitida na expressão: {type(no).__name__}"
    )


def interpretar_expressao(expressao):
    """
    Interpreta uma expressão matemática real dependente apenas de t.

    Operações aceitas:
    +, -, *, /, **, ^

    Funções aceitas:
    sin, cos, tan, sqrt, exp, log, abs

    Constantes:
    pi, E
    """

    if not isinstance(expressao, str) or not expressao.strip():
        raise ErroExpressao("Informe uma expressão matemática.")

    texto = expressao.strip().replace("^", "**")

    if len(texto) > 300:
        raise ErroExpressao("A expressão ultrapassa 300 caracteres.")

    try:
        arvore = ast.parse(texto, mode="eval")
        resultado = _converter(arvore.body)
        resultado = sp.sympify(resultado)

    except ErroExpressao:
        raise
    except (SyntaxError, TypeError, ValueError, ZeroDivisionError) as erro:
        raise ErroExpressao(
            "Não foi possível interpretar a expressão."
        ) from erro

    if resultado.free_symbols - {TEMPO}:
        raise ErroExpressao(
            "A expressão pode depender somente da variável t."
        )

    return sp.simplify(resultado)

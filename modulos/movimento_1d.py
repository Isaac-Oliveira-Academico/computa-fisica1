from dataclasses import dataclass

import sympy as sp


tempo = sp.symbols("t", real=True)
tau = sp.symbols("tau", real=True)


def numero_exato(valor):
    """Converte números digitados como float para uma forma SymPy estável."""
    if isinstance(valor, sp.Basic):
        return valor
    if isinstance(valor, int):
        return sp.Integer(valor)
    if isinstance(valor, float):
        return sp.Rational(str(valor))
    return sp.sympify(valor)


def construir_movimento(
    tipo,
    conhecida,
    t0=0,
    x0=None,
    v0=None,
):
    """
    Constrói x(t), v(t) e a(t) a partir de uma das três funções.

    x conhecida -> deriva para v e a
    v conhecida -> integra para x usando x(t0)
    a conhecida -> integra para v e x usando v(t0) e x(t0)
    """
    t0 = numero_exato(t0)

    if x0 is not None:
        x0 = numero_exato(x0)

    if v0 is not None:
        v0 = numero_exato(v0)

    conhecida = sp.simplify(conhecida)

    if tipo == "x":
        x_expr = conhecida
        v_expr = sp.diff(x_expr, tempo)
        a_expr = sp.diff(v_expr, tempo)

    elif tipo == "v":
        if x0 is None:
            raise ValueError(
                "Para integrar v(t), é necessário conhecer x(t0)."
            )

        v_expr = conhecida
        a_expr = sp.diff(v_expr, tempo)
        v_tau = v_expr.subs(tempo, tau)

        x_expr = x0 + sp.integrate(
            v_tau,
            (tau, t0, tempo),
        )

    elif tipo == "a":
        if x0 is None or v0 is None:
            raise ValueError(
                "Para integrar a(t), é necessário conhecer x(t0) e v(t0)."
            )

        a_expr = conhecida
        a_tau = a_expr.subs(tempo, tau)

        v_expr = v0 + sp.integrate(
            a_tau,
            (tau, t0, tempo),
        )

        v_tau = v_expr.subs(tempo, tau)
        x_expr = x0 + sp.integrate(
            v_tau,
            (tau, t0, tempo),
        )

    else:
        raise ValueError("Tipo deve ser x, v ou a.")

    return (
        sp.simplify(x_expr),
        sp.simplify(v_expr),
        sp.simplify(a_expr),
    )


@dataclass(frozen=True)
class TrechoMovimento:
    inicio: float
    fim: float
    x: sp.Expr
    v: sp.Expr
    a: sp.Expr

    def __post_init__(self):
        if self.fim <= self.inicio:
            raise ValueError("O fim do trecho deve ser maior que o início.")


@dataclass
class Movimento1D:
    trechos: list[TrechoMovimento]
    nome: str = "Partícula"

    def __post_init__(self):
        if not self.trechos:
            raise ValueError("O movimento precisa de pelo menos um trecho.")

        self.trechos.sort(key=lambda item: item.inicio)

        for anterior, atual in zip(self.trechos, self.trechos[1:]):
            if abs(anterior.fim - atual.inicio) > 1e-10:
                raise ValueError(
                    "Os trechos devem ser contíguos, sem lacunas ou sobreposições."
                )

    @property
    def t_min(self):
        return self.trechos[0].inicio

    @property
    def t_max(self):
        return self.trechos[-1].fim

    @property
    def por_trechos(self):
        return len(self.trechos) > 1

    def _piecewise(self, atributo):
        partes = []

        for indice, trecho in enumerate(self.trechos):
            expr = getattr(trecho, atributo)

            if indice < len(self.trechos) - 1:
                condicao = sp.And(
                    tempo >= numero_exato(trecho.inicio),
                    tempo < numero_exato(trecho.fim),
                )
            else:
                condicao = sp.And(
                    tempo >= numero_exato(trecho.inicio),
                    tempo <= numero_exato(trecho.fim),
                )

            partes.append((expr, condicao))

        partes.append((sp.nan, True))
        return sp.Piecewise(*partes, evaluate=False)

    @property
    def x(self):
        if len(self.trechos) == 1:
            return self.trechos[0].x
        return self._piecewise("x")

    @property
    def v(self):
        if len(self.trechos) == 1:
            return self.trechos[0].v
        return self._piecewise("v")

    @property
    def a(self):
        if len(self.trechos) == 1:
            return self.trechos[0].a
        return self._piecewise("a")

    def trecho_em(self, instante):
        valor = float(instante)

        for indice, trecho in enumerate(self.trechos):
            ultimo = indice == len(self.trechos) - 1

            if trecho.inicio <= valor < trecho.fim:
                return trecho

            if ultimo and abs(valor - trecho.fim) <= 1e-10:
                return trecho

        return None

    def avaliar(self, grandeza, instante):
        trecho = self.trecho_em(instante)

        if trecho is None:
            raise ValueError(
                f"t={instante:g} s está fora do domínio "
                f"[{self.t_min:g}, {self.t_max:g}] s."
            )

        expr = getattr(trecho, grandeza)
        return sp.simplify(expr.subs(tempo, numero_exato(instante)))

    def validar_continuidade(self, tolerancia=1e-9):
        """
        Retorna avisos de descontinuidade em x e v nas fronteiras.

        x descontínuo normalmente não representa uma trajetória física clássica.
        v descontínua pode representar uma idealização impulsiva.
        """
        avisos = []

        for anterior, atual in zip(self.trechos, self.trechos[1:]):
            tb = numero_exato(anterior.fim)

            x_esq = sp.N(anterior.x.subs(tempo, tb))
            x_dir = sp.N(atual.x.subs(tempo, tb))
            v_esq = sp.N(anterior.v.subs(tempo, tb))
            v_dir = sp.N(atual.v.subs(tempo, tb))

            try:
                dx = abs(float(x_dir - x_esq))
            except (TypeError, ValueError):
                dx = None

            try:
                dv = abs(float(v_dir - v_esq))
            except (TypeError, ValueError):
                dv = None

            if dx is None or dx > tolerancia:
                avisos.append(
                    {
                        "tipo": "posicao",
                        "tempo": float(tb),
                        "esquerda": x_esq,
                        "direita": x_dir,
                    }
                )

            if dv is None or dv > tolerancia:
                avisos.append(
                    {
                        "tipo": "velocidade",
                        "tempo": float(tb),
                        "esquerda": v_esq,
                        "direita": v_dir,
                    }
                )

        return avisos


def criar_movimento_um_trecho(
    tipo,
    conhecida,
    t_inicial,
    t_final,
    t0=0,
    x0=None,
    v0=None,
    nome="Partícula",
):
    x_expr, v_expr, a_expr = construir_movimento(
        tipo,
        conhecida,
        t0=t0,
        x0=x0,
        v0=v0,
    )

    trecho = TrechoMovimento(
        float(t_inicial),
        float(t_final),
        x_expr,
        v_expr,
        a_expr,
    )

    return Movimento1D([trecho], nome=nome)

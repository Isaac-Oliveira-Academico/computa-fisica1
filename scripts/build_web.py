
from pathlib import Path
import shutil


RAIZ_PROJETO = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ_PROJETO / "computa"
DESTINO = RAIZ_PROJETO / "docs" / "python" / "computa"


def copiar_modulos_python():
    """Prepara os módulos oficiais do motor para execução no navegador."""

    if not ORIGEM.is_dir():
        raise FileNotFoundError(
            f"Diretório do motor não encontrado: {ORIGEM}"
        )

    arquivos = sorted(ORIGEM.rglob("*.py"))

    if not arquivos:
        raise RuntimeError(
            "Nenhum módulo Python foi encontrado em computa/."
        )

    # Substitui somente a cópia gerada para publicação.
    if DESTINO.exists():
        shutil.rmtree(DESTINO)

    DESTINO.mkdir(parents=True, exist_ok=True)

    copiados = []

    for arquivo in arquivos:
        relativo = arquivo.relative_to(ORIGEM)

        if "__pycache__" in relativo.parts:
            continue

        destino = DESTINO / relativo
        destino.parent.mkdir(parents=True, exist_ok=True)

        shutil.copy2(arquivo, destino)
        copiados.append(relativo)

    # Garante que os diretórios sejam pacotes Python.
    diretorios = sorted(
        {arquivo.parent for arquivo in DESTINO.rglob("*.py")}
    )

    for diretorio in diretorios:
        inicializador = diretorio / "__init__.py"

        if not inicializador.exists():
            inicializador.write_text(
                '"""Pacote do motor COMPUTA."""\n',
                encoding="utf-8",
            )

    print("BUILD WEB CONCLUÍDO")
    print(f"Origem:  {ORIGEM}")
    print(f"Destino: {DESTINO}")
    print(f"Módulos copiados: {len(copiados)}")

    for arquivo in copiados:
        print(f"  - {arquivo.as_posix()}")


if __name__ == "__main__":
    copiar_modulos_python()

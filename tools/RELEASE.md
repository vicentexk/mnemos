# REGIME GITHUB-FIRST (desde a sessão 11)
O workspace do Arena tem limite de snapshot (~128MB). Zips de 85MB estouravam o limite
e o ambiente ROLAVA BACK (perda de arquivos). Regras:

1. NUNCA guardar zip do jogo no workspace. Zip vive SÓ no GitHub (release/).
2. .git enxuto: fetch sempre com --filter=blob:none; sparse-checkout exclui release/.
3. Build do exe: /tmp (fora do snapshot). Electron: /tmp/electron-pkg/appdir.
4. Release: git hash-object -w <zip> + git update-index --add --cacheinfo
   100644,<sha>,release/<nome>.zip + commit + push (um único push).
5. Depois do push: bash /tmp/slim.sh (re-clona sem blobs) OU recriar:
   git clone --depth=1 --filter=blob:none --no-checkout + sparse '/*' '!/release' + checkout;
   copiar .git por cima; git update-index --skip-worktree release/*.zip.
6. SEM preview do Arena (pedido do user). O produto é o .exe.
7. Pós-rollback (se o ambiente voltar no tempo): chmod 600 ~/.ssh/mnemos_deploy;
   git remote set-url origin git@github.com:vicentexk/mnemos.git;
   git fetch --filter=blob:none origin main; git reset --hard FETCH_HEAD.

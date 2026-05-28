#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-$(pwd)}"
APPLY_MODE="${2:-}"
CURRENT_UID="$(id -u)"
CURRENT_GID="$(id -g)"
CURRENT_USER="$(id -un)"
CURRENT_GROUP="$(id -gn)"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Error: target '$TARGET_DIR' no es un directorio."
  exit 1
fi

TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

if [[ "$TARGET_DIR" == "/" ]]; then
  echo "Error: se bloquea ejecución sobre '/'."
  exit 1
fi

echo "Audit de ownership en: $TARGET_DIR"
echo "Usuario/grupo esperado: $CURRENT_USER:$CURRENT_GROUP ($CURRENT_UID:$CURRENT_GID)"

mapfile -t MISMATCHED < <(
  rg --files "$TARGET_DIR" -g '!**/.git/**' | while IFS= read -r path; do
    owner="$(stat -c '%u:%g' "$path" 2>/dev/null || true)"
    if [[ "$owner" != "$CURRENT_UID:$CURRENT_GID" ]]; then
      echo "$path"
    fi
  done
)

if [[ "${#MISMATCHED[@]}" -eq 0 ]]; then
  echo "No se detectaron archivos con ownership distinto."
  exit 0
fi

echo
echo "Se detectaron ${#MISMATCHED[@]} rutas con owner/grupo distinto:"
for item in "${MISMATCHED[@]}"; do
  echo "  - $item"
done

echo
echo "Comando de reparación sugerido (NO ejecutado):"
echo "sudo chown -R $CURRENT_USER:$CURRENT_GROUP \"$TARGET_DIR\""

if [[ "$APPLY_MODE" != "--apply" ]]; then
  echo
  echo "Modo seguro activo: solo auditoría."
  echo "Para aplicar, ejecutar explícitamente:"
  echo "  $0 \"$TARGET_DIR\" --apply"
  exit 0
fi

echo
echo "Se solicitó modo apply."
echo "Este script requiere confirmación textual exacta para continuar."
read -r -p "Escribe FIX_OWNERSHIP para confirmar: " confirmation

if [[ "$confirmation" != "FIX_OWNERSHIP" ]]; then
  echo "Confirmación inválida. No se hicieron cambios."
  exit 1
fi

echo "Aplicando chown recursivo seguro sobre $TARGET_DIR ..."
sudo chown -R "$CURRENT_USER:$CURRENT_GROUP" "$TARGET_DIR"
echo "Reparación de ownership completada."

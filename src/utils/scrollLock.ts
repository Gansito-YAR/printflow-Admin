// Bloqueo del desplazamiento de fondo con contador: si se abren ventanas
// anidadas (p. ej. "Cliente nuevo" dentro de un pedido), cerrar la interior no
// desbloquea mientras la exterior siga abierta.

let locks = 0;

export function lockScroll(): () => void {
  locks += 1;
  document.body.classList.add("scroll-locked");
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) document.body.classList.remove("scroll-locked");
  };
}

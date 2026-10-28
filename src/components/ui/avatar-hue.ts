/** Opt-in name hue from the approved mockup (L1608), shared with sender labels. */
export function mockupAvatarHue(name: string): number {
  let hue = 0;
  for (const character of name) {
    hue = (hue * 31 + character.charCodeAt(0)) % 360;
  }
  return hue >= 15 && hue <= 85 ? hue + 140 : hue;
}

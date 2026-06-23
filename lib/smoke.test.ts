import pkg from "@/package.json";

// Smoke test — potvrđuje da test infra radi (T1.6).
// Ne testira poslovnu logiku; samo da Jest pokreće TS, da @/* alias radi
// i da je projekat tačno imenovan. Prvi pravi lib test je T3.1 (formatCount).
describe("test infra (smoke)", () => {
  it("pokreće TypeScript + Jest", () => {
    expect(1 + 1).toBe(2);
  });

  it("resolvuje @/* path alias (root)", () => {
    expect(pkg.name).toBe("blahblah");
  });
});

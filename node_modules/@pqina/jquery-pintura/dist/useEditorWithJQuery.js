const c = "pintura", D = (o, i) => {
  if (!o || !i)
    return;
  const { appendEditor: h, appendDefaultEditor: d, isSupported: l, dispatchEditorEvents: y } = i;
  if (!l()) {
    o.fn[c] = () => {
    };
    return;
  }
  const E = (t) => !t.length || typeof t[0] == "object", b = (t, e) => {
    const n = Object.getOwnPropertyDescriptor(t, e);
    return n ? typeof n.get < "u" : !1;
  }, w = (t, e) => {
    const n = Object.getOwnPropertyDescriptor(t, e);
    return n ? typeof n.set < "u" : !1;
  }, m = (t, e) => typeof t[e] == "function" && !/^before|after|will/.test(e), f = /* @__PURE__ */ new Map(), a = (t) => function(...e) {
    const n = [], O = this.each(function() {
      if (E(e)) {
        const u = t(this, e[0]), g = y(u, this);
        u.on("destroy", () => {
          g.forEach((j) => j()), f.delete(this);
        }), f.set(this, u);
        return;
      }
      const r = f.get(this);
      if (!r)
        return;
      const s = e[0], p = e.concat().slice(1);
      if (m(r, s)) {
        n.push(r[s].apply(r, p));
        return;
      }
      if (w(r, s) && p.length) {
        r[s] = p[0];
        return;
      }
      if (b(r, s)) {
        n.push(r[s]);
        return;
      }
      console.warn("$()." + c + '("' + s + '") is an unknown property or method.');
    });
    return n.length ? this.length === 1 ? n[0] : n : O;
  };
  o.fn[c] = a(h), o.fn[c + "Default"] = a(d), Object.keys(i).forEach((t) => o.fn[c][t] = i[t]);
};
export {
  D as default
};

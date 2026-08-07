# Configurar o formulário (EmailJS) + deploy no GitHub Pages

## 1. Criar conta e ligar o Gmail

1. Registar em https://dashboard.emailjs.com
2. **Email Services** → Add New Service → Gmail → autorizar a conta Gmail
   que vai *enviar* os emails. Guardar o **Service ID**.

## 2. Criar o template

**Email Templates** → Create New Template.

- **To Email:** `geral@luminaria.pt`
- **Reply To:** `{{reply_to}}`
- **Subject:** `[Contacto] {{assunto}} — {{nome}}`
- **Content:**

```
Nome: {{nome}}
Email: {{email}}
Telefone: {{telefone}}
Empresa: {{empresa}}
Website/Instagram: {{website}}
Assunto: {{assunto}}

Mensagem:
{{mensagem}}

---
Enviado via luminaria.pt · {{data}}
```

Guardar o **Template ID**.

> As variáveis entre `{{ }}` têm de ter exactamente estes nomes — são os que
> o `script.js` envia.

## 3. Colar as 3 chaves

Abrir `script.js`, procurar `EMAILJS_CFG` (perto do fim) e substituir:

```js
var EMAILJS_CFG = {
  publicKey:  'PUBLIC_KEY_AQUI',    // Account → General → Public Key
  serviceId:  'SERVICE_ID_AQUI',    // Email Services → Service ID
  templateId: 'TEMPLATE_ID_AQUI',   // Email Templates → Template ID
};
```

Enquanto estiverem por preencher, o formulário mostra um aviso em vez de
falhar em silêncio.

## 4. IMPORTANTE — bloquear o domínio

**Account → Security → Allow List** → adicionar `luminaria.pt`.

A Public Key fica visível no browser de qualquer visitante. Sem esta
restrição, qualquer pessoa pode copiá-la e gastar a quota gratuita
(200 envios/mês) a partir de outro site.

Activar também **"Block headless browsers"** na mesma página.

## 5. Deploy no GitHub Pages

1. Criar repositório e fazer push de todo o conteúdo desta pasta
2. **Settings → Pages** → Source: `Deploy from a branch` → `main` / `/ (root)`
3. **Custom domain:** `luminaria.pt` (o ficheiro `CNAME` já está incluído)
4. No registrar do domínio, apontar o DNS:
   - `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` de `www` → `<utilizador>.github.io`
5. Activar **Enforce HTTPS** (aparece uns minutos depois do DNS propagar)

## 6. Testar

Submeter o formulário três vezes:
- só com email
- só com telemóvel
- com os dois

Verificar que os três chegam a `geral@luminaria.pt`.

## Notas

- A pasta `api/` foi removida — era uma serverless function do Vercel e não
  corria no GitHub Pages.
- Plano gratuito do EmailJS: **200 envios/mês, 2 templates**.
- O email de confirmação automático ao cliente deixou de existir. Se o
  quiseres, dá para fazer com um 2.º template (cabe no plano gratuito),
  mas gasta 2 envios da quota por cada contacto.
- O rate limiting por IP também desapareceu. A Allow List do ponto 4 é a
  protecção principal.

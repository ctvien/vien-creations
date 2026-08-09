// Thin client for the /server design storage backend. In dev, Vite proxies
// /api to the backend (see vite.config.js) so relative paths work as-is; a
// separate production deploy would need an absolute API base URL instead.

export class DesignSubmitError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = 'DesignSubmitError';
    this.cause = cause;
  }
}

export async function submitDesign({ previewBlob, productionBlob, productType }) {
  const formData = new FormData();
  formData.append('preview', previewBlob, 'preview.png');
  formData.append('production', productionBlob, 'production.svg');
  formData.append('product_type', productType);

  let response;
  try {
    response = await fetch('/api/designs', { method: 'POST', body: formData });
  } catch (cause) {
    throw new DesignSubmitError(
      'Could not reach the server. Check your connection and try again.',
      { cause }
    );
  }

  if (!response.ok) {
    let message = `Save failed (HTTP ${response.status}).`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON; fall back to the generic message above
    }
    throw new DesignSubmitError(message);
  }

  const { reference_code: referenceCode } = await response.json();
  return referenceCode;
}

const supabase = require('./supabase');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const useSupabase = supabase && 
                    supabaseUrl && 
                    supabaseKey && 
                    !supabaseUrl.includes('your-project-id') && 
                    !supabaseKey.includes('your-supabase-anon');

// Bucket único no Supabase para o sistema
const BUCKET_NAME = 'nexoimoveis';

/**
 * Salva um arquivo (da memória) no destino apropriado (Supabase Storage ou Disco Local)
 * @param {Object} file Objeto do arquivo vindo do Multer (com buffer)
 * @param {string} moduleFolder Pasta do módulo (ex: 'imoveis', 'despesas', 'manutencoes', etc.)
 * @returns {Promise<string>} URL pública ou caminho local do arquivo
 */
async function salvarArquivo(file, moduleFolder) {
  if (!file || !file.buffer) {
    throw new Error('Nenhum arquivo fornecido para upload.');
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${uniqueSuffix}${ext}`;

  if (useSupabase) {
    try {
      const filePath = `${moduleFolder}/${filename}`;
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          duplex: 'half'
        });

      if (error) {
        throw error;
      }

      // Obter URL pública do arquivo
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      console.log(`[Storage] Upload realizado com sucesso para o Supabase: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('[Storage] Erro no upload para o Supabase Storage, caindo de volta para armazenamento local:', err.message);
      // Se falhar o upload para o Supabase, fazemos o fallback automático para o disco local!
    }
  }

  // Armazenamento em Disco Local
  const localDir = path.join(__dirname, '../../uploads', moduleFolder);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const localFilePath = path.join(localDir, filename);
  fs.writeFileSync(localFilePath, file.buffer);

  console.log(`[Storage] Arquivo salvo no disco local: /uploads/${moduleFolder}/${filename}`);
  return `/uploads/${moduleFolder}/${filename}`;
}

module.exports = {
  salvarArquivo,
  useSupabase
};

const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

// Path to jobs
const jobsPath = path.join(__dirname, '../jobs');

// Scheduler function to initialize all jobs
const initScheduler = () => {
  console.log('Initializing scheduled jobs...');

  // Running daily at 00:05
  cron.schedule('5 0 * * *', () => {
    console.log('[Cron] Running daily routines...');
    
    // Dynamically run the jobs if they are implemented and exported
    const jobs = [
      'gerarRecebimentos.job',
      'gerarDespesasRecorrentes.job',
      'gerarNotificacoes.job',
      'verificarContratos.job',
      'verificarDocumentos.job',
      'verificarDespesas.job',
      'verificarManutencoes.job',
      'verificarVistorias.job',
      'verificarRecebimentos.job'
    ];

    jobs.forEach(jobName => {
      const jobFile = path.join(jobsPath, `${jobName}.js`);
      if (fs.existsSync(jobFile)) {
        try {
          const job = require(jobFile);
          if (typeof job === 'function') {
            job();
          } else if (job && typeof job.run === 'function') {
            job.run();
          }
        } catch (error) {
          console.error(`[Cron] Error executing job ${jobName}:`, error);
        }
      }
    });
  });

  console.log('[Cron] Scheduler initialized. Daily routines set to midnight (00:05).');
};

module.exports = {
  initScheduler,
};

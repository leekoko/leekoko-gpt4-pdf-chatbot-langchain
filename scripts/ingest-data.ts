import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { pinecone } from '@/utils/pinecone-client';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';

const filePath = 'docs';
const processedPath = 'processed'; // Directory to store processed file records


async function loadDocumentsFromDirectory(directoryPath: fs.PathLike) {
  // Read all files in the directory
  const files = await fs.promises.readdir(directoryPath);
  const rawDocs = [];

  for (const file of files) {
    // Check if the file is a PDF
    if (path.extname(file) !== '.pdf') {
      continue;
    }

    const processedRecordFile = path.join(processedPath, `${path.basename(file)}.processed`);
    const isProcessed = await checkIfFileExists(processedRecordFile);

    if (isProcessed) {
      console.log(`Skipping processed file: ${file}`);
      continue;
    }

    // Load the PDF file
    const pdfPath = path.join(filePath, file);
    const pdfLoader = new PDFLoader(pdfPath);
    const rawDoc = await pdfLoader.load();


    rawDocs.push(...rawDoc);
    // Write an empty processed record file
    await createEmptyFile(processedRecordFile);
  }

  return rawDocs;
}


export const run = async () => {
  try {

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
//    const rawDocs = loadDocumentsFromDirectory(filePath);
    const rawDocs = await loadDocumentsFromDirectory(filePath);
    if (!rawDocs.length) {
      console.log('No documents to process.');
      return;
    }
    console.log(rawDocs);

    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log('split docs', docs);

    console.log('creating vector store...');
    /*create and store the embeddings in the vectorStore*/
    const embeddings = new OpenAIEmbeddings({}, {
      basePath: 'https://api.openai-sb.com/v1'
    });

    const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name

    //embed the PDF documents
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace: PINECONE_NAME_SPACE,
      textKey: 'text',
    });

  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};

const checkIfFileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

const createEmptyFile = async (filePath: string) => {
  await fs.promises.writeFile(filePath, '');
};

(async () => {
  await run();
  console.log('ingestion complete');
})();

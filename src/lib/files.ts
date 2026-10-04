// Mimi accepts documents, images and office files, but never source code.
export const ALLOWED_FILE_ACCEPT =
  ".pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.csv,.rtf,.odt,.ods,image/*";

const CODE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|java|c|cc|cpp|h|hpp|cs|go|rs|rb|php|swift|kt|kts|scala|sh|bash|zsh|ps1|bat|cmd|sql|html|htm|css|scss|sass|less|vue|svelte|json|xml|yaml|yml|toml|ini|lua|pl|r|dart|ipynb|md|exe|dll|jar|apk|msi)$/i;

export function isCodeFile(file: File) {
  return CODE_EXT.test(file.name) || /javascript|typescript|x-python|x-sh|x-php|json|xml|html/i.test(file.type);
}

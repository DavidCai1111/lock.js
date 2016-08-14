#include <node.h>

int main (int argc, char** argv) {
  const int scriptArgc = 5;
  char* scriptArgv[] = {
    "node",
    "-e",
    SCRIPT,
    SRC,
    PUBLIC_KEY
  };

  return node::Start(scriptArgc, scriptArgv);
}

#include <node.h>
#include "project.h"

int main (int argc, char** argv) {
  const int scriptArgc = 5;

  char* scriptArgv[] = {
    const_cast<char*>("node"),
    const_cast<char*>("-e"),
    const_cast<char*>(SCRIPT),
    const_cast<char*>(PROJECT),
    const_cast<char*>(PUBLIC_KEY)
  };

  return node::Start(scriptArgc, scriptArgv);
}

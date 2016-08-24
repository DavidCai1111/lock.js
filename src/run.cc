#include <node.h>
#include "project-1.h"
#include "project-2.h"
#include "project-3.h"
#include "project-4.h"
#include "project-5.h"

int main (int argc, char** argv) {
  const int scriptArgc = SCRIPT_ARGC;

  char* scriptArgv[] = {
    const_cast<char*>("node"),
    const_cast<char*>("-e"),
    const_cast<char*>(SCRIPT),
    const_cast<char*>(PUBLIC_KEY),
    const_cast<char*>(PROJECT_1),
    const_cast<char*>(PROJECT_2),
    const_cast<char*>(PROJECT_3),
    const_cast<char*>(PROJECT_4),
    const_cast<char*>(PROJECT_5)
  };

  return node::Start(scriptArgc, scriptArgv);
}

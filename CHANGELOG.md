# Change Log

## [1.38.1]

Added:

* Post Blocks from 1.38.0 added to Post Blocks tree viewer

## [1.38.0]

Added:

* New Post Variables, APIs, and Lua APIs for the 2025 BobCAD-CAM product line (BobCAD-CAM V38, BobCAM for SolidWorks V13)
    * Post Variables Added: rotaryPosition_reset_G92, helix_num_revolutions
    * Post Variables Updated: mdi_custom_double_xxx(double var), mdi_custom_int_xxx(int var), and mdi_string_double_xxx(string var)
    * Post APIs Updated: MILL_GetOperationType(), EDM_GetOperationType()
    * Post Blocks Added: 562.  Support G92 Working Offset? y, 563.  G Code for G92 - programmable working offset? "G92", 735. Prefix for Helix Num of Revolutions (helix_num_revolutions)? "D", 736. G Code for Helix CW? "G06", 737. G Code for Helix CCW? "G07", 3560. Output Lathe Tool Y-Shift in the g-code? y

* Missing Post Blocks and Variables from BCC V36 and V37
    * Post Variables Added: helix_pitch, helix_totalangles, output_note, local_sub_num_call, local_sub_num_def, local_sub_num_no_prefix
    * Post Blocks Added: 102. Haas Peck Tapping Cycle, 103. Haas Peck Tapping Cycle Point

## [1.0.11]

Added:

* More Code Snippets for Mill-Turn Blocks

## [1.0.10]

Added:

* .hpst extension for syntax highlighting for Wire EDM Holes
* More Code Snippets specific to Post Processors (eg. begin encrypt)

## [1.0.9]

Fixed:

* Fixed issue where CTRL + Click program blocks that did not account for program blocks that are double digits

## [1.0.8]

Added:

* Added more code snippets for lua functions

Updated:

* .BCPst syntax highlighting for lua_func_FunctionName({arg1 = 1, arg2 = false}) 

## [1.0.7]

Added:

* Will now suggest user-defined functions (lua and VBScript)

## [1.0.6]

Added:

* Added inverse logic for Go to Program Block. You can now hold CTRL and click on the Program Block number and go to all instances of program_block_# and lua_block_#

## [1.0.5]

Added:

* Will now suggest user-defined variables

Updated:

* Formatter will now also check incorrect spaces rather than just tabs 

## [1.0.4]

Updated:

* The descriptions of Post Variables and APIs are now formatted and more human readable

## [1.0.3]

Updated:

* The Post Processor Help System now opens in an external browser since there is no CTRL + F supported in webview yet.

## [1.0.2]

Fixed:

* Erased Duplicates for AutoCompletion

Added:

* Syntax Highlighting for header of .edmpst files

## [1.0.0]

- Initial release
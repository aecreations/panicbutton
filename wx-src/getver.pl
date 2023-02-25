#!/usr/bin/perl

# Retrieves the version number of the extension.
# This script must be executed in the same directory as the extension's
# manifest JSON file.

use POSIX;
use JSON;

use constant RELEASETYPE_STABLE => 0;
use constant RELEASETYPE_PRE_MAJOR => 1;
use constant RELEASETYPE_PRE_MINOR => 2;
use constant RELEASETYPE_PRE_REVISION => 3;


sub getMozVersion() {
  my ($version) = @_;
  
  my $rv = "";
  my %parsedVer = &parse($version);

  if ($parsedVer{'releaseType'} == RELEASETYPE_STABLE) {
    $rv = $version;
  }
  else {
    my $devBuildSfx = &getDevBuildSuffix;
    my $mozMajor, $mozMinor;
    my $mozVerSfx = "";

    if ($parsedVer{'releaseType'} == RELEASETYPE_PRE_MAJOR) {
      $mozMajor = $parsedVer{'major'} + 1;
      $mozMinor = 0;
      $mozVerSfx = &getMozVersionSuffix($parsedVer{'minor'}, $parsedVer{'revision'});
      $rv = $mozMajor . "." . $mozMinor . $mozVerSfx . $devBuildSfx;
    }
    elsif ($parsedVer{'releaseType'} == RELEASETYPE_PRE_MINOR) {
      $mozMajor = $parsedVer{'major'};
      $mozMinor = $parsedVer{'minor'} + 1;
      $mozVerSfx = &getMozVersionSuffix($parsedVer{'revision'}, $parsedVer{'patch'});
      $rv = $mozMajor . "." . $mozMinor . $mozVerSfx . $devBuildSfx;
    }
    elsif ($parsedVer{'releaseType'} == RELEASETYPE_PRE_REVISION) {
      $mozMajor = $parsedVer{'major'};
      $mozMinor = $parsedVer{'minor'};
      my $mozRev = $parsedVer{'revision'} + 1;
      $mozVerSfx = &getMozVersionSuffix($parsedVer{'patch'}, 1);
      $rv = $mozMajor . "." . $mozMinor . "." . $mozRev . $mozVerSfx . $devBuildSfx;
    }
  }
  
  return $rv;
}


sub parse() {
  my ($version) = @_;
  
  my ($major, $minor, $revision, $patch) = split /\./, $version;

  my $releaseType = RELEASETYPE_STABLE;
  my %preReleaseVers = map { $_ => 1 } (98, 99, 998, 999);
  if (exists $preReleaseVers{$minor}) {
    $releaseType = RELEASETYPE_PRE_MAJOR;
  }
  elsif (exists $preReleaseVers{$revision}) {
    $releaseType = RELEASETYPE_PRE_MINOR;
  }
  else {
    %preReleaseVers = map { $_ => 1 } (97, 98, 99, 998, 999);
    if (exists $preReleaseVers{$patch}) {
      $releaseType = RELEASETYPE_PRE_REVISION;
    }
  }

  my %rv = (
    releaseType => $releaseType,
    major => $major,
    minor => $minor,
    revision => $revision,
    patch => $patch
  );

  return %rv;
}


sub getMozVersionSuffix() {
  my ($subversion, $preReleaseVer) = @_;

  my $rv = "";

  if (! defined $preReleaseVer) {
    $preReleaseVer = 1;
  }

  if ($subversion == 97) {  # pre-alpha
    $rv = "a0";
  }
  elsif ($subversion == 98) {  # alpha
    $rv = "a" . $preReleaseVer;
  }
  elsif ($subversion == 99) {  # beta
    $rv = "b" . $preReleaseVer;
  }
  elsif ($subversion == 998) {  # technical preview
    $rv = "pre" . $preReleaseVer;
  }
  elsif ($subversion == 999) {  # release candidate
    $rv = "rc" . $preReleaseVer;
  }

  return $rv;
}


sub getDevBuildSuffix() {
  my $rv = "";

  my $constFile = "./scripts/aeConst.js";
  open(my $fh, "<:encoding(UTF-8)", $constFile) or die "Could not open $constFile\n";

  while (<$fh>) {
    chomp;
    if (/DEV_BUILD: (true)/) {
      $rv = "+";
      last;
    }
  }

  return $rv;
}


local $/;

open(my $fh, "<:encoding(UTF-8)", "manifest.json");

my $manifest_json = <$fh>;
my $manifest = decode_json($manifest_json);
my $ver = &getMozVersion($manifest->{version});

# Unstable build for testing
if ($ver =~ /\+$/) {
    $ver .= '.' . strftime("%Y%m%d", localtime);
}

print $ver;
